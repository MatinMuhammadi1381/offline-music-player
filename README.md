# Offline Music Player

**A private, offline-first music player for Android and iPhone.** Your original audio files stay in the locations you choose; the app does not upload your music.

[![Deploy to GitHub Pages](https://github.com/MatinMuhammadi1381/offline-music-player/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/MatinMuhammadi1381/offline-music-player/actions/workflows/deploy-pages.yml)
[![Version](https://img.shields.io/badge/version-1.5.4-1687ff)](VERSION)

**Web app:** [Open Offline Music Player](https://matinmuhammadi1381.github.io/offline-music-player/)

**Android:** [Download the Android APK](https://matinmuhammadi1381.github.io/offline-music-player/downloads/offline-music-player-android-debug.apk) · [SHA-256 checksums](https://matinmuhammadi1381.github.io/offline-music-player/downloads/SHA256SUMS.txt)

> **Important:** The Android download is a debug-signed development APK, not a Play Store or production release. Install only if you trust this project.

## فارسی

**یک پخش‌کنندهٔ موسیقی خصوصی و آفلاین برای اندروید و آیفون.** فایل‌ها روی دستگاه پردازش می‌شوند و جایی آپلود نمی‌شوند. در PWA آیفون، فایل‌های انتخاب‌شده در فضای خصوصی برنامه ذخیره می‌شوند تا بعد از بازکردن دوباره قابل پخش باشند؛ نسخهٔ اصلی را نگه دارید چون iOS می‌تواند داده‌های وب را پاک کند.

- **نسخهٔ وب / PWA:** [اجرای پخش‌کننده](https://matinmuhammadi1381.github.io/offline-music-player/)
- **اندروید:** [دانلود فایل APK](https://matinmuhammadi1381.github.io/offline-music-player/downloads/offline-music-player-android-debug.apk)
- **صحت فایل دانلودی:** [مشاهدهٔ SHA-256](https://matinmuhammadi1381.github.io/offline-music-player/downloads/SHA256SUMS.txt)

> **توجه:** فایل اندروید فعلی نسخهٔ توسعه با امضای debug است و نسخهٔ رسمی فروشگاه یا انتشار production نیست. نصب را فقط در صورت اعتماد به پروژه انجام دهید.

### امکانات

- رابط واکنش‌گرا و موبایل‌محور برای وب، PWA آیفون و برنامهٔ اندروید
- کتابخانهٔ محلی، جست‌وجو و مرتب‌سازی، صف پخش و فهرست‌های پخش
- پوستهٔ ثابت در اندازهٔ صفحه با بخش‌های مستقل؛ در گوشی پنل‌های کتابخانه و پلی‌لیست تا درست بالای نوار پایین باز و بدون لبهٔ بستهٔ پایینی ادامه دارند. خطوط پنل به خط دور نوار، بدون تغییر گوشه‌های گرد آن، متصل‌اند و اسکرول فقط داخل پنل انجام می‌شود.
- صفحهٔ راهنمای نصب متناسب با iPhone، Android و رایانه؛ پخش‌کننده پس از نصب و اجرای آیکون برنامه باز می‌شود.
- نوار پخش کوچک در چیدمان جا دارد و روی پنل‌ها نمی‌افتد؛ فضای پیمایش انتهای فهرست، نمایش کامل آخرین آهنگ‌ها را ممکن می‌کند.
- آیکون اختصاصی Android و آیکون‌های به‌روزشدهٔ نوار پیمایش موبایل
- در PWA آیفون، کپی محلی فایل صوتی در IndexedDB خصوصی همان برنامه برای پخش بعد از بستن و بازکردن؛ فایل‌ها به سرور آپلود نمی‌شوند
- نمایش تصویر کاور جاسازی‌شدهٔ فایل‌های MP3 دارای تگ ID3، بدون آپلود یا ذخیرهٔ تصویر در کتابخانه
- نگهداری فراداده و تنظیمات در فضای محلی مرورگر و پشتیبان‌گیری JSON فقط از فراداده
- پوستهٔ برنامهٔ وب پس از بارگیری اولیه برای اجرای آفلاین cache می‌شود

### نصب اندروید

1. فایل [APK اندروید](https://matinmuhammadi1381.github.io/offline-music-player/downloads/offline-music-player-android-debug.apk) را در دستگاه دریافت کنید.
2. در صورت درخواست Android، اجازهٔ نصب برنامه از مرورگر یا فایل‌منیجر را فعال کنید.
3. برنامه را نصب و فایل‌های موسیقی را از انتخاب‌گر سیستمی اضافه کنید.
4. برای بررسی صحت فایل، SHA-256 آن را با [فهرست checksum](https://matinmuhammadi1381.github.io/offline-music-player/downloads/SHA256SUMS.txt) مقایسه کنید.

APK فعلی با کلید توسعه امضا شده است. ممکن است Android هنگام نصب دربارهٔ منبع یا امضای برنامه هشدار دهد. شناسهٔ بسته فعلی `com.offlinemusicplayer.spike` است؛ این شناسه و امضای برنامه برای انتشار نهایی تعیین نشده‌اند.

### نصب نسخهٔ وب در Android و رایانه

1. [نسخهٔ وب](https://matinmuhammadi1381.github.io/offline-music-player/) را در مرورگر باز کنید و راهنمای نصب روی صفحه را دنبال کنید.
2. در Chrome یا Edge، در صورت نمایش گزینهٔ نصب، نصب برنامه را تأیید کنید؛ در غیر این صورت دستورهای مرورگر را دنبال کنید.
3. پس از نصب، Offline Music را از آیکون صفحهٔ اصلی یا فهرست برنامه‌ها اجرا کنید.

### نصب PWA در آیفون

1. لینک [نسخهٔ وب](https://matinmuhammadi1381.github.io/offline-music-player/) را در Safari باز کنید و راهنمای نصب صفحه را دنبال کنید.
2. از منوی Share گزینهٔ **Add to Home Screen** را انتخاب و نصب را تأیید کنید.
3. پس از نصب، Offline Music را از صفحهٔ اصلی باز کنید؛ بار اول اتصال اینترنت برای بارگیری پوستهٔ برنامه لازم است.
4. فایل‌های صوتی را از دستگاه انتخاب کنید.

## وضعیت پروژه و محدودیت‌ها

- نسخهٔ پروژه: **1.5.4** (طبق [Semantic Versioning](music-player-agent-docs/06-VERSIONING-AND-RELEASES.md)).
- انتشار روی GitHub Pages به معنی تأیید نهایی یا آمادگی production نیست.
- پخش پس‌زمینه و کنترل‌های media بومی Android هنوز به رابط مشترک برنامه متصل نشده‌اند.
- PWA آیفون کپی محلی آهنگ‌ها را برای استفاده بین نشست‌ها ذخیره می‌کند، اما iOS تضمین نگهداری چندماهه نمی‌دهد و ممکن است دادهٔ سایت را پاک کند؛ نسخهٔ اصلی آهنگ‌ها را حفظ کنید. Android فعلاً پس از بازراه‌اندازی به انتخاب دوبارهٔ فایل نیاز دارد.
- پشتیبان JSON فقط فراداده و فهرست‌ها را نگه می‌دارد و شامل فایل صوتی نیست.
- برای وضعیت دقیق، نتایج تست و موانع انتشار، [گزارش handoff](music-player-agent-docs/10-DEVELOPMENT-HANDOFF.md) و [معیارهای پذیرش](music-player-agent-docs/07-TESTING-AND-ACCEPTANCE.md) را ببینید.

## English

### Features

- Responsive, phone-first shared interface for the web, iPhone Home Screen PWA, and Android app.
- A fixed viewport shell with library and playlist panels; on phones, the panels stay open to the bottom navigation and their side borders connect to its outline without changing its rounded shape, while only panel contents scroll without a visible scrollbar.
- A platform-aware installation guide for iPhone, Android, and desktop; the music player opens when launched from the installed app icon.
- The mini-player occupies layout space instead of covering content, and extra list-end space allows the last tracks to scroll fully into view.
- Updated mobile navigation icons and a dedicated adaptive Android launcher icon.
- Local library, search and sorting, playback queue, and playlists.
- Displays embedded ID3 cover artwork for MP3 files when present; images are read locally and are not uploaded or saved in library metadata.
- On the iPhone PWA, selected audio is copied into private, origin-local IndexedDB so it can be reopened for playback; it is never uploaded. Android's packaged app retains its existing session-only file behavior.
- Local metadata/settings persistence and JSON metadata-only backups.
- The PWA shell is cached after the first successful load for offline app launch.

### Install on Android

1. Download the [Android APK](https://matinmuhammadi1381.github.io/offline-music-player/downloads/offline-music-player-android-debug.apk).
2. If prompted, allow your browser or file manager to install apps from this source.
3. Install the app and select music using Android's system picker.
4. Optionally verify the file against the published [SHA-256 checksums](https://matinmuhammadi1381.github.io/offline-music-player/downloads/SHA256SUMS.txt).

This APK is signed with a development key. Android may warn about the source or signature. Its current application ID is `com.offlinemusicplayer.spike`; the package identity and signing key are not final.

### Install the PWA on Android and desktop

Open the [web app](https://matinmuhammadi1381.github.io/offline-music-player/) in your browser and follow its installation guide. In Chrome or Edge, accept the install prompt when available, then launch Offline Music from its installed app icon.

### Install on iPhone

Open the [web app](https://matinmuhammadi1381.github.io/offline-music-player/) in Safari and follow its installation guide. Choose **Share → Add to Home Screen**, confirm, then open Offline Music from the Home Screen. Launch it online once to cache the app shell, then select audio from your device.

### Project status and limitations

- Project version: **1.5.4**, following [Semantic Versioning](music-player-agent-docs/06-VERSIONING-AND-RELEASES.md).
- GitHub Pages availability does not mean the app has passed production or final acceptance.
- Native Android background playback and media-session controls are not yet connected to the shared UI.
- iOS may evict browser storage or the user may clear site data; this is not a months-long retention guarantee. Keep original audio files. Android may require reselecting files after app restart. JSON backups include metadata and playlists, not audio.
- Embedded artwork is currently extracted from MP3 ID3 APIC tags; other audio-container artwork is not yet supported.
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
