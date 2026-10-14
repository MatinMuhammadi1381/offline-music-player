package com.offlinemusicplayer.spike;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebResourceError;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.ArrayList;

public final class SharedPlayerActivity extends Activity {
    private static final int REQUEST_AUDIO_FILES = 20;
    private static final int REQUEST_METADATA_BACKUP_EXPORT = 21;
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String ASSET_PREFIX = "/assets/player/";
    private static final String PLAYER_BASE_URL = "https://" + ASSET_HOST + ASSET_PREFIX;

    private ValueCallback<Uri[]> pendingFileSelection;
    private String pendingBackupJson;
    private WebView webView;
    private TextView errorView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF070B14);
        webView = new WebView(this);
        errorView = new TextView(this);
        errorView.setTextColor(0xFFFFB4AB);
        errorView.setTextSize(16);
        errorView.setPadding(dp(24), dp(24), dp(24), dp(24));
        errorView.setVisibility(TextView.GONE);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        root.addView(errorView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        setContentView(root);

        webView.setBackgroundColor(0xFF070B14);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return !"https".equals(uri.getScheme())
                    || !ASSET_HOST.equals(uri.getHost());
            }

            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                    WebView view,
                    WebResourceRequest request
            ) {
                return openPackagedAsset(request.getUrl());
            }

            @Override
            public void onReceivedError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceError error
            ) {
                if (request.isForMainFrame()) {
                    showError("The offline player could not be opened: " + error.getDescription());
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                if (pendingFileSelection != null) pendingFileSelection.onReceiveValue(null);
                pendingFileSelection = filePathCallback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                String[] acceptTypes = fileChooserParams.getAcceptTypes();
                boolean metadataBackup = false;
                if (acceptTypes != null) {
                    for (String type : acceptTypes) {
                        if (type != null && (type.contains("json") || type.endsWith(".json"))) {
                            metadataBackup = true;
                            break;
                        }
                    }
                }
                picker.setType(metadataBackup ? "application/json" : "audio/*");
                if (fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }
                picker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivityForResult(picker, REQUEST_AUDIO_FILES);
                    return true;
                } catch (ActivityNotFoundException exception) {
                    pendingFileSelection = null;
                    filePathCallback.onReceiveValue(null);
                    showError("The Android audio file picker is unavailable: " + exception.getMessage());
                    return true;
                }
            }
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        webView.addJavascriptInterface(new AndroidBackupBridge(), "OfflineMusicAndroid");
        try (InputStream stream = getAssets().open("player/index.html")) {
            byte[] html = readAll(stream);
            webView.loadDataWithBaseURL(
                    PLAYER_BASE_URL,
                    new String(html, StandardCharsets.UTF_8),
                    "text/html",
                    "UTF-8",
                    null
            );
        } catch (IOException exception) {
            showError("The packaged offline player could not be opened: " + exception.getMessage());
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_METADATA_BACKUP_EXPORT) {
            writeMetadataBackup(resultCode, data);
            return;
        }
        if (requestCode != REQUEST_AUDIO_FILES) return;

        ValueCallback<Uri[]> callback = pendingFileSelection;
        pendingFileSelection = null;
        if (callback == null) return;
        if (resultCode != RESULT_OK || data == null) {
            callback.onReceiveValue(null);
            return;
        }

        ArrayList<Uri> selected = new ArrayList<>();
        if (data.getClipData() != null) {
            for (int index = 0; index < data.getClipData().getItemCount(); index++) {
                Uri uri = data.getClipData().getItemAt(index).getUri();
                if (uri != null && !selected.contains(uri)) selected.add(uri);
            }
        } else if (data.getData() != null) {
            selected.add(data.getData());
        }
        callback.onReceiveValue(selected.isEmpty() ? null : selected.toArray(new Uri[0]));
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        pendingBackupJson = null;
        if (pendingFileSelection != null) {
            pendingFileSelection.onReceiveValue(null);
            pendingFileSelection = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private void showError(String message) {
        errorView.setText(message);
        errorView.setVisibility(TextView.VISIBLE);
    }

    private android.webkit.WebResourceResponse openPackagedAsset(Uri uri) {
        if (!"https".equals(uri.getScheme()) || !ASSET_HOST.equals(uri.getHost())) {
            return errorResponse(403, "External resources are disabled.");
        }
        String path = Uri.decode(uri.getPath());
        if (path == null || !path.startsWith(ASSET_PREFIX) || path.contains("..") || path.contains("\\")) {
            return errorResponse(404, "App resource not found.");
        }
        String assetPath = "player/" + path.substring(ASSET_PREFIX.length());
        try {
            InputStream stream = getAssets().open(assetPath);
            String mimeType = mimeType(assetPath);
            return new android.webkit.WebResourceResponse(
                    mimeType,
                    mimeType.startsWith("text/") || mimeType.contains("javascript") ? "UTF-8" : null,
                    stream
            );
        } catch (IOException exception) {
            return errorResponse(404, "App resource not found.");
        }
    }

    private android.webkit.WebResourceResponse errorResponse(int status, String message) {
        return new android.webkit.WebResourceResponse(
                "text/plain",
                "UTF-8",
                status,
                status == 403 ? "Forbidden" : "Not Found",
                Collections.emptyMap(),
                new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8))
        );
    }

    private String mimeType(String assetPath) {
        if (assetPath.endsWith(".js")) return "text/javascript";
        if (assetPath.endsWith(".css")) return "text/css";
        if (assetPath.endsWith(".html")) return "text/html";
        if (assetPath.endsWith(".svg")) return "image/svg+xml";
        if (assetPath.endsWith(".webmanifest")) return "application/manifest+json";
        if (assetPath.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    private byte[] readAll(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8 * 1024];
        int count;
        while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
        return output.toByteArray();
    }

    private final class AndroidBackupBridge {
        @android.webkit.JavascriptInterface
        public void saveMetadataBackup(String backupJson) {
            if (backupJson == null || backupJson.isEmpty()) {
                runOnUiThread(() -> dispatchBackupResult("failed", "The metadata backup is empty."));
                return;
            }
            runOnUiThread(() -> {
                if (pendingBackupJson != null) {
                    dispatchBackupResult("failed", "Another metadata backup export is already in progress.");
                    return;
                }
                pendingBackupJson = backupJson;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, "offline-music-backup.json");
                try {
                    startActivityForResult(intent, REQUEST_METADATA_BACKUP_EXPORT);
                } catch (ActivityNotFoundException exception) {
                    pendingBackupJson = null;
                    dispatchBackupResult("failed", "The Android document picker is unavailable: "
                            + exception.getMessage());
                }
            });
        }
    }

    private void writeMetadataBackup(int resultCode, Intent data) {
        String backupJson = pendingBackupJson;
        pendingBackupJson = null;
        if (backupJson == null) return;
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            dispatchBackupResult("cancelled", "Backup export was cancelled.");
            return;
        }

        try (OutputStream output = getContentResolver().openOutputStream(data.getData(), "w")) {
            if (output == null) throw new IOException("The selected backup location could not be opened.");
            output.write(backupJson.getBytes(StandardCharsets.UTF_8));
            dispatchBackupResult("saved", "Metadata backup saved. Audio and file permissions were not included.");
        } catch (IOException | SecurityException exception) {
            dispatchBackupResult("failed", "Could not save the metadata backup: " + exception.getMessage());
        }
    }

    private void dispatchBackupResult(String status, String message) {
        if (webView == null) return;
        String detail = "{\"status\":" + JSONObject.quote(status)
                + ",\"message\":" + JSONObject.quote(message) + "}";
        webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('offline-music-backup-export', {detail:" + detail + "}))",
                null
        );
    }
}
