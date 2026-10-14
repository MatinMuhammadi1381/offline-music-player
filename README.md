# Offline Music Player

**A private, offline-first music player for Android and iPhone.** Your original audio files stay in the locations you choose; the app does not upload your music.

[![Deploy to GitHub Pages](https://github.com/MatinMuhammadi1381/offline-music-player/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/MatinMuhammadi1381/offline-music-player/actions/workflows/deploy-pages.yml)
[![Version](https://img.shields.io/badge/version-1.1.0-1687ff)](VERSION)

**Web app:** [Open Offline Music Player](https://matinmuhammadi1381.github.io/offline-music-player/)

**Android:** [Download the Android APK](https://matinmuhammadi1381.github.io/offline-music-player/downloads/offline-music-player-android-debug.apk) · [SHA-256 checksums](https://matinmuhammadi1381.github.io/offline-music-player/downloads/SHA256SUMS.txt)

> **Important:** The Android download is a debug-signed development APK, not a Play Store or production release. Install only if you trust this project. Real-device acceptance is still outstanding.

## فارسی

**یک پخش‌کنندهٔ موسیقی خصوصی و آفلاین برای اندروید و آیفون.** فایل‌های اصلی موسیقی در همان محل انتخاب‌شده توسط شما باقی می‌مانند و برنامه آن‌ها را آپلود نمی‌کند.

- **نسخهٔ وب / PWA:** [اجرای پخش‌کننده](https://matinmuhammadi1381.github.io/offline-music-player/)
- **اندروید:** [دانلود فایل APK](https://matinmuhammadi1381.github.io/offline-music-player/downloads/offline-music-player-android-debug.apk)
- **صحت فایل دانلودی:** [مشاهدهٔ SHA-256](https://matinmuhammadi1381.github.io/offline-music-player/downloads/SHA256SUMS.txt)

> **توجه:** فایل اندروید فعلی نسخهٔ توسعه با امضای debug است و نسخهٔ رسمی فروشگاه یا انتشار production نیست. نصب را فقط در صورت اعتماد به پروژه انجام دهید. آزمایش روی دستگاه واقعی هنوز کامل نشده است.

### امکانات

- رابط واکنش‌گرا و موبایل‌محور برای وب، PWA آیفون و برنامهٔ اندروید
- کتابخانهٔ محلی، جست‌وجو و مرتب‌سازی، صف پخش و فهرست‌های پخش
- پخش فایل انتخاب‌شده از دستگاه؛ فایل صوتی در سرور بارگذاری یا در IndexedDB کپی نمی‌شود
- نگهداری فراداده و تنظیمات در فضای محلی مرورگر و پشتیبان‌گیری JSON فقط از فراداده
- پوستهٔ برنامهٔ وب پس از بارگیری اولیه برای اجرای آفلاین cache می‌شود

### نصب اندروید

1. فایل [APK اندروید](https://matinmuhammadi1381.github.io/offline-music-player/downloads/offline-music-player-android-debug.apk) را در دستگاه دریافت کنید.
2. در صورت درخواست Android، اجازهٔ نصب برنامه از مرورگر یا فایل‌منیجر را فعال کنید.
3. برنامه را نصب و فایل‌های موسیقی را از انتخاب‌گر سیستمی اضافه کنید.
4. برای بررسی صحت فایل، SHA-256 آن را با [فهرست checksum](https://matinmuhammadi1381.github.io/offline-music-player/downloads/SHA256SUMS.txt) مقایسه کنید.

APK فعلی با کلید توسعه امضا شده است. ممکن است Android هنگام نصب دربارهٔ منبع یا امضای برنامه هشدار دهد. شناسهٔ بسته فعلی `com.offlinemusicplayer.spike` است؛ این شناسه و امضای برنامه برای انتشار نهایی تعیین نشده‌اند.

### نصب PWA در آیفون

1. لینک [نسخهٔ وب](https://matinmuhammadi1381.github.io/offline-music-player/) را در Safari باز کنید.
2. از منوی Share گزینهٔ **Add to Home Screen** را انتخاب کنید.
3. بار اول برنامه را با اینترنت باز کنید تا پوستهٔ برنامه cache شود.
4. فایل‌های صوتی را از دستگاه انتخاب کنید. رفتار دسترسی فایل، پخش پس‌زمینه و آفلاین باید روی دستگاه واقعی شما آزمایش شود.

## وضعیت پروژه و محدودیت‌ها

- نسخهٔ پروژه: **1.1.0** (طبق [Semantic Versioning](music-player-agent-docs/06-VERSIONING-AND-RELEASES.md)).
- انتشار روی GitHub Pages به معنی تأیید نهایی یا آمادگی production نیست.
- پخش پس‌زمینه و کنترل‌های media بومی Android هنوز به رابط مشترک برنامه متصل نشده‌اند.
- انتخاب دوبارهٔ فایل ممکن است پس از بستن برنامه یا پایان نشست لازم شود؛ پشتیبان JSON فقط فراداده و فهرست‌ها را نگه می‌دارد، نه صدا یا مجوز دسترسی فایل.
- آزمایش کامل روی دستگاه‌های واقعی iPhone و Android هنوز انجام نشده است.
- برای وضعیت دقیق، نتایج تست و موانع انتشار، [گزارش handoff](music-player-agent-docs/10-DEVELOPMENT-HANDOFF.md) و [معیارهای پذیرش](music-player-agent-docs/07-TESTING-AND-ACCEPTANCE.md) را ببینید.

## English

### Features

- Responsive, phone-first shared interface for the web, iPhone Home Screen PWA, and Android app.
- Local library, search and sorting, playback queue, and playlists.
- Audio is selected from the device and is not uploaded or copied into IndexedDB.
- Local metadata/settings persistence and JSON metadata-only backups.
- The PWA shell is cached after the first successful load for offline app launch.

### Install on Android

1. Download the [Android APK](https://matinmuhammadi1381.github.io/offline-music-player/downloads/offline-music-player-android-debug.apk).
2. If prompted, allow your browser or file manager to install apps from this source.
3. Install the app and select music using Android's system picker.
4. Optionally verify the file against the published [SHA-256 checksums](https://matinmuhammadi1381.github.io/offline-music-player/downloads/SHA256SUMS.txt).

This APK is signed with a development key. Android may warn about the source or signature. Its current application ID is `com.offlinemusicplayer.spike`; the package identity and signing key are not final.

### Install on iPhone

Open the [web app](https://matinmuhammadi1381.github.io/offline-music-player/) in Safari, choose **Share → Add to Home Screen**, and launch it once online so the app shell can be cached. Select audio from your device. File access, background playback, and offline behavior still require acceptance testing on a physical device.

### Project status and limitations

- Project version: **1.1.0**, following [Semantic Versioning](music-player-agent-docs/06-VERSIONING-AND-RELEASES.md).
- GitHub Pages availability does not mean the app has passed production or final acceptance.
- Native Android background playback and media-session controls are not yet connected to the shared UI.
- File access may need to be restored after an app/browser session ends. JSON backups include metadata and playlists, not audio or file permissions.
- Full physical-device testing on iPhone and Android remains outstanding.
- See the [development handoff](music-player-agent-docs/10-DEVELOPMENT-HANDOFF.md) and [acceptance criteria](music-player-agent-docs/07-TESTING-AND-ACCEPTANCE.md) for verification evidence and release blockers.

## Run locally

Requirements: Node.js 22.13+, pnpm 12.4.1, JDK 17, and Android SDK 34 to build the APK.

```powershell
pnpm install --frozen-lockfile
pnpm dev:web
```

Useful checks and builds:

```powershell
npm test
npm run typecheck
pnpm typecheck:web
pnpm build:web
npm run package:development
```

`npm run package:development` runs tests and typechecks, builds/lints the Android debug APK and PWA, and creates local development artifacts with SHA-256 checksums in the ignored `release-artifacts/development/` directory.

## Repository map

- `apps/player-web/` — shared React PWA and browser UI.
- `apps/android-file-access-spike/` — Android WebView wrapper and system file-picker bridge.
- `packages/` — shared domain logic, contracts, types, and web-platform adapters.
- `music-player-agent-docs/` — requirements, roadmap, acceptance criteria, and build handoff.
- `music-player-uiux-spec/` — product UI/UX specification.
- `.github/workflows/deploy-pages.yml` — CI checks, PWA/APK build, and GitHub Pages deployment.

## Privacy

Do not commit personal music, private library metadata, credentials, signing keys, or certificates. Use synthetic or explicitly approved local test media. The deployed site contains the app shell and APK only; it does not contain user audio.

## License

No open-source license has been declared yet. Unless a license is added, the source is published for viewing and use by the repository owner; standard copyright restrictions apply.
