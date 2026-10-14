param(
    [string]$OutputDirectory
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $repoRoot "release-artifacts\development"
} elseif (-not [System.IO.Path]::IsPathRooted($OutputDirectory)) {
    $OutputDirectory = Join-Path $repoRoot $OutputDirectory
}

function Invoke-CheckedCommand {
    param(
        [string]$Executable,
        [string[]]$Arguments
    )

    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Executable $($Arguments -join ' ')"
    }
}

Push-Location $repoRoot
try {
    Invoke-CheckedCommand "npm" @("test")
    Invoke-CheckedCommand "npm" @("run", "typecheck")
    Invoke-CheckedCommand "pnpm" @("--filter", "@offline-music-player/player-web", "typecheck")

    $androidProject = Join-Path $repoRoot "apps\android-file-access-spike"
    Push-Location $androidProject
    try {
        Invoke-CheckedCommand ".\gradlew.bat" @("assembleDebug", "lintDebug")
    } finally {
        Pop-Location
    }

    $distDirectory = Join-Path $repoRoot "apps\player-web\dist"
    $apkSource = Join-Path $androidProject "app\build\outputs\apk\debug\app-debug.apk"
    if (-not (Test-Path -LiteralPath (Join-Path $distDirectory "index.html") -PathType Leaf)) {
        throw "The PWA production build did not produce index.html."
    }
    if (-not (Test-Path -LiteralPath $apkSource -PathType Leaf)) {
        throw "The Android debug build did not produce app-debug.apk."
    }

    New-Item -Path $OutputDirectory -ItemType Directory -Force | Out-Null
    $pwaArchive = Join-Path $OutputDirectory "offline-music-player-pwa.zip"
    $apkDestination = Join-Path $OutputDirectory "offline-music-player-android-debug.apk"
    $checksumFile = Join-Path $OutputDirectory "SHA256SUMS.txt"
    foreach ($path in @($pwaArchive, $apkDestination, $checksumFile)) {
        if (Test-Path -LiteralPath $path) {
            Remove-Item -LiteralPath $path -Force
        }
    }

    Compress-Archive -Path (Join-Path $distDirectory "*") -DestinationPath $pwaArchive -CompressionLevel Optimal
    Copy-Item -LiteralPath $apkSource -Destination $apkDestination

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($pwaArchive)
    try {
        $entries = @($archive.Entries | ForEach-Object { $_.FullName.Replace("\", "/") })
        if ($entries -notcontains "index.html") {
            throw "The PWA archive must contain index.html at its root."
        }
        if (-not ($entries | Where-Object { $_ -match "^assets/index-.*\.js$" })) {
            throw "The PWA archive is missing its JavaScript application bundle."
        }
        if (-not ($entries | Where-Object { $_ -match "^assets/index-.*\.css$" })) {
            throw "The PWA archive is missing its stylesheet bundle."
        }
    } finally {
        $archive.Dispose()
    }

    $version = (Get-Content -LiteralPath (Join-Path $repoRoot "VERSION") -Raw).Trim()
    $manifestLines = @(
        "Offline Music development handoff artifacts",
        "Version: $version",
        "Built: $([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss zzz'))",
        "The Android APK uses the debug signing identity and is not a production release.",
        ""
    )
    foreach ($artifact in @($pwaArchive, $apkDestination)) {
        $hash = (Get-FileHash -LiteralPath $artifact -Algorithm SHA256).Hash
        $manifestLines += "$hash  $(Split-Path -Leaf $artifact)"
    }
    Set-Content -LiteralPath $checksumFile -Value $manifestLines -Encoding Ascii

    Write-Output "Development handoff artifacts created in: $OutputDirectory"
    Get-ChildItem -LiteralPath $OutputDirectory | Select-Object Name, Length
    Get-Content -LiteralPath $checksumFile
} finally {
    Pop-Location
}
