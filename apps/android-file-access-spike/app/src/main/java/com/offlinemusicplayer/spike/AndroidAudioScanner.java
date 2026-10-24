package com.offlinemusicplayer.spike;

import android.app.Activity;
import android.content.ContentUris;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public final class AndroidAudioScanner {
    private static final String PREFERENCES_NAME = "android_audio_scanner";
    private static final String INITIAL_SCAN_COMPLETE_KEY = "initial_scan_complete";
    private static final ExecutorService SCAN_EXECUTOR = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "android-audio-scan");
        thread.setDaemon(true);
        return thread;
    });
    private static final Handler MAIN_HANDLER = new Handler(Looper.getMainLooper());
    private static final String[] PROJECTION = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.MIME_TYPE,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.DATE_ADDED
    };

    private AndroidAudioScanner() {
    }

    public static String requiredReadPermission() {
        return Build.VERSION.SDK_INT >= 33
                ? "android.permission.READ_MEDIA_AUDIO"
                : "android.permission.READ_EXTERNAL_STORAGE";
    }

    public static boolean hasReadPermission(Context context) {
        return context.checkSelfPermission(requiredReadPermission()) == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * Requests access when needed. A false result means the caller must wait for
     * the Activity permission callback before calling scan.
     */
    public static boolean ensureReadPermission(Activity activity, int requestCode) {
        if (hasReadPermission(activity)) return true;
        activity.requestPermissions(new String[]{requiredReadPermission()}, requestCode);
        return false;
    }

    public static boolean isInitialScanComplete(Context context) {
        return context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .getBoolean(INITIAL_SCAN_COMPLETE_KEY, false);
    }

    /**
     * Call only after every returned item has been durably imported by the shared library.
     */
    public static void markInitialScanComplete(Context context) {
        boolean saved = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(INITIAL_SCAN_COMPLETE_KEY, true)
                .commit();
        if (!saved) throw new IllegalStateException("Could not save Android audio scan state.");
    }

    /**
     * Queries MediaStore and must be called off the main thread.
     * Use each entry's stableId as the imported track ID to prevent re-imports.
     */
    public static List<AudioItem> scan(Context context) {
        if (!hasReadPermission(context)) {
            throw new SecurityException("Android audio library permission has not been granted.");
        }

        Context appContext = context.getApplicationContext();
        LinkedHashMap<String, AudioItem> uniqueItems = new LinkedHashMap<>();
        if (Build.VERSION.SDK_INT >= 29) {
            Set<String> volumeNames = MediaStore.getExternalVolumeNames(appContext);
            for (String volumeName : volumeNames) {
                queryVolume(appContext, volumeName, uniqueItems);
            }
        } else {
            queryVolume(appContext, null, uniqueItems);
        }

        ArrayList<AudioItem> items = new ArrayList<>(uniqueItems.values());
        Collections.sort(items, new Comparator<AudioItem>() {
            @Override
            public int compare(AudioItem left, AudioItem right) {
                int titleOrder = String.CASE_INSENSITIVE_ORDER.compare(left.title, right.title);
                return titleOrder != 0 ? titleOrder : left.stableId.compareTo(right.stableId);
            }
        });
        return Collections.unmodifiableList(items);
    }

    /**
     * Scans on a private serial worker and returns callbacks on the main thread.
     * Cancel from the owning Activity's onDestroy to suppress stale callbacks.
     */
    public static ScanOperation scanAsync(Context context, ScanCallback callback) {
        Context appContext = context.getApplicationContext();
        AtomicBoolean cancelled = new AtomicBoolean(false);
        SCAN_EXECUTOR.execute(() -> {
            try {
                List<AudioItem> items = scan(appContext);
                MAIN_HANDLER.post(() -> {
                    if (!cancelled.get()) callback.onSuccess(items);
                });
            } catch (Exception exception) {
                MAIN_HANDLER.post(() -> {
                    if (!cancelled.get()) callback.onFailure(exception);
                });
            }
        });
        return () -> cancelled.set(true);
    }

    private static void queryVolume(
            Context context,
            String volumeName,
            LinkedHashMap<String, AudioItem> uniqueItems
    ) {
        Uri collection = volumeName == null
                ? MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
                : MediaStore.Audio.Media.getContentUri(volumeName);
        String selection = MediaStore.Audio.Media.SIZE + " > 0";
        try (Cursor cursor = context.getContentResolver().query(
                collection,
                PROJECTION,
                selection,
                null,
                MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC"
        )) {
            if (cursor == null) throw new IllegalStateException("MediaStore returned no audio cursor.");
            int idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
            int nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME);
            int titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
            int mimeColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE);
            int durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
            int artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
            int albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
            int sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE);
            int dateAddedColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED);

            while (cursor.moveToNext()) {
                long mediaId = cursor.getLong(idColumn);
                Uri itemUri = ContentUris.withAppendedId(collection, mediaId);
                String stableId = "android-mediastore:" + itemUri;
                String fileName = cursor.getString(nameColumn);
                String title = cursor.getString(titleColumn);
                if (title == null || title.trim().isEmpty()) title = fileName;
                long duration = cursor.getLong(durationColumn);
                long dateAddedSeconds = cursor.getLong(dateAddedColumn);

                AudioItem item = new AudioItem(
                        stableId,
                        itemUri,
                        fileName,
                        title,
                        optionalMetadata(cursor.getString(artistColumn)),
                        optionalMetadata(cursor.getString(albumColumn)),
                        optionalMetadata(cursor.getString(mimeColumn)),
                        cursor.isNull(durationColumn) || duration <= 0 ? null : duration,
                        cursor.getLong(sizeColumn),
                        dateAddedSeconds <= 0 ? 0 : dateAddedSeconds * 1000L
                );
                uniqueItems.put(stableId, item);
            }
        } catch (SecurityException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            String location = volumeName == null ? "external storage" : volumeName;
            throw new IllegalStateException("Could not scan audio from " + location + ".", exception);
        }
    }

    private static String optionalMetadata(String value) {
        return value == null || value.trim().isEmpty() || MediaStore.UNKNOWN_STRING.equals(value)
                ? null
                : value;
    }

    public interface ScanCallback {
        void onSuccess(List<AudioItem> items);

        void onFailure(Exception exception);
    }

    public interface ScanOperation {
        void cancel();
    }

    public static final class AudioItem {
        public final String stableId;
        public final Uri uri;
        public final String fileName;
        public final String title;
        public final String artist;
        public final String album;
        public final String mimeType;
        public final Long durationMs;
        public final long fileSizeBytes;
        public final long addedAtMs;

        private AudioItem(
                String stableId,
                Uri uri,
                String fileName,
                String title,
                String artist,
                String album,
                String mimeType,
                Long durationMs,
                long fileSizeBytes,
                long addedAtMs
        ) {
            this.stableId = stableId;
            this.uri = uri;
            this.fileName = fileName;
            this.title = title;
            this.artist = artist;
            this.album = album;
            this.mimeType = mimeType;
            this.durationMs = durationMs;
            this.fileSizeBytes = fileSizeBytes;
            this.addedAtMs = addedAtMs;
        }
    }
}
