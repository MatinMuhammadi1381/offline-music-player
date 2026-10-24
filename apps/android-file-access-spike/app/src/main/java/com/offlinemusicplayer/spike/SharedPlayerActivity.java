package com.offlinemusicplayer.spike;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.annotation.SuppressLint;
import android.view.View;
import android.view.ViewGroup;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.util.Base64;
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
import org.json.JSONArray;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

public final class SharedPlayerActivity extends Activity {
    private static final int REQUEST_AUDIO_FILES = 20;
    private static final int REQUEST_METADATA_BACKUP_EXPORT = 21;
    private static final int REQUEST_NOTIFICATIONS = 22;
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String ASSET_PREFIX = "/assets/player/";
    private static final String PLAYER_BASE_URL = "https://" + ASSET_HOST + ASSET_PREFIX;
    private static final String MEDIA_URI_PREFERENCES = "shared_player_media_uris";
    private static final String NOTIFICATION_PERMISSION_REQUESTED = "notification_permission_requested";

    private ValueCallback<Uri[]> pendingFileSelection;
    private String pendingBackupJson;
    private Intent pendingPlaybackIntent;
    private volatile ArrayList<Uri> selectedAudioUris = new ArrayList<>();
    private final Set<String> persistableAudioUris = Collections.synchronizedSet(new HashSet<>());
    private WebView webView;
    private TextView errorView;
    private boolean serviceReceiverRegistered;
    private final BroadcastReceiver serviceReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (webView == null || intent == null) return;
            String action = intent.getAction();
            if (PlaybackService.ACTION_SHARED_CONTROL.equals(action)) {
                JSONObject detail = new JSONObject();
                try {
                    detail.put("action", intent.getStringExtra(PlaybackService.EXTRA_CONTROL_ACTION));
                    if (intent.hasExtra(PlaybackService.EXTRA_SEEK_POSITION)) {
                        detail.put("positionMs", intent.getIntExtra(PlaybackService.EXTRA_SEEK_POSITION, 0));
                    }
                    dispatchWindowEvent("offline-music-native-control", detail);
                } catch (org.json.JSONException exception) {
                    showError("Android playback control could not be forwarded: " + exception.getMessage());
                }
            } else if (PlaybackService.ACTION_SHARED_STATE.equals(action)) {
                JSONObject detail = new JSONObject();
                try {
                    detail.put("state", intent.getStringExtra(PlaybackService.EXTRA_STATE));
                    String trackId = intent.getStringExtra(PlaybackService.EXTRA_TRACK_ID);
                    if (trackId != null) detail.put("trackId", trackId);
                    detail.put("positionMs", intent.getLongExtra(PlaybackService.EXTRA_POSITION, 0));
                    detail.put("durationMs", intent.getLongExtra(PlaybackService.EXTRA_DURATION, 0));
                    String failure = intent.getStringExtra(PlaybackService.EXTRA_FAILURE);
                    if (failure != null) detail.put("failure", new JSONObject().put("message", failure));
                    dispatchWindowEvent("offline-music-native-playback", detail);
                } catch (org.json.JSONException exception) {
                    showError("Android playback state could not be forwarded: " + exception.getMessage());
                }
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF080D18);
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

        webView.setBackgroundColor(0xFF080D18);
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
        registerServiceReceiver();
        serviceReceiverRegistered = true;
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
        selectedAudioUris = selected;
        persistableAudioUris.clear();
        for (Uri uri : selected) {
            try {
                getContentResolver().takePersistableUriPermission(
                        uri, Intent.FLAG_GRANT_READ_URI_PERMISSION
                );
                persistableAudioUris.add(uri.toString());
            } catch (SecurityException exception) {
                // Providers that do not offer persistable grants can still be used for this session.
            }
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
        pendingPlaybackIntent = null;
        if (serviceReceiverRegistered) {
            unregisterReceiver(serviceReceiver);
            serviceReceiverRegistered = false;
        }
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

    @SuppressLint("UnspecifiedRegisterReceiverFlag")
    private void registerServiceReceiver() {
        IntentFilter serviceEvents = new IntentFilter();
        serviceEvents.addAction(PlaybackService.ACTION_SHARED_CONTROL);
        serviceEvents.addAction(PlaybackService.ACTION_SHARED_STATE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(serviceReceiver, serviceEvents, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(serviceReceiver, serviceEvents);
        }
    }

    private void applySystemBarTheme(boolean lightMode) {
        int color = lightMode ? Color.rgb(243, 246, 251) : Color.rgb(8, 13, 24);
        getWindow().setStatusBarColor(color);
        getWindow().setNavigationBarColor(color);

        View decor = getWindow().getDecorView();
        int flags = decor.getSystemUiVisibility() & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        if (lightMode) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
        }
        decor.setSystemUiVisibility(flags);
        if (webView != null) webView.setBackgroundColor(color);
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

    private void dispatchWindowEvent(String eventName, JSONObject detail) {
        if (webView == null) return;
        webView.post(() -> {
            if (webView != null) {
                webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent(" + JSONObject.quote(eventName)
                                + ", {detail:" + detail + "}))",
                        null
                );
            }
        });
    }

    private void startPlaybackService(Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            SharedPreferences preferences = getSharedPreferences(MEDIA_URI_PREFERENCES, MODE_PRIVATE);
            if (!preferences.getBoolean(NOTIFICATION_PERMISSION_REQUESTED, false)) {
                preferences.edit().putBoolean(NOTIFICATION_PERMISSION_REQUESTED, true).apply();
                pendingPlaybackIntent = intent;
                requestPermissions(
                        new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                        REQUEST_NOTIFICATIONS
                );
                return;
            }
        }
        launchPlaybackService(intent);
    }

    private void launchPlaybackService(Intent intent) {
        pendingPlaybackIntent = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_NOTIFICATIONS || pendingPlaybackIntent == null) return;
        Intent playbackIntent = pendingPlaybackIntent;
        pendingPlaybackIntent = null;
        launchPlaybackService(playbackIntent);
        if (grantResults.length == 0 || grantResults[0] != PackageManager.PERMISSION_GRANTED) {
            dispatchWindowEvent("offline-music-native-playback-permission", new JSONObject());
        }
    }

    private final class AndroidBackupBridge {
        @android.webkit.JavascriptInterface
        public void setTheme(boolean lightMode) {
            runOnUiThread(() -> applySystemBarTheme(lightMode));
        }

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

        @android.webkit.JavascriptInterface
        public synchronized String registerSelectedTracks(String tracksJson) {
            try {
                JSONArray tracks = new JSONArray(tracksJson);
                if (tracks.length() == 0 || tracks.length() != selectedAudioUris.size()) {
                    return "Android could not match the selected audio files with their media references. Select them again.";
                }
                SharedPreferences.Editor editor = getSharedPreferences(MEDIA_URI_PREFERENCES, MODE_PRIVATE).edit();
                for (int index = 0; index < tracks.length(); index++) {
                    Uri uri = selectedAudioUris.get(index);
                    if (!persistableAudioUris.contains(uri.toString())) {
                        return "Android did not grant persistent access to one selected file. Choose it again from the system Files app.";
                    }
                    JSONObject track = tracks.getJSONObject(index);
                    String trackId = track.optString("id");
                    if (trackId.isEmpty()) return "Android could not save a selected track reference.";
                    editor.putString("uri:" + trackId, uri.toString());
                }
                if (!editor.commit()) return "Android could not save the selected track references.";
                selectedAudioUris.clear();
                return "";
            } catch (org.json.JSONException exception) {
                return "Android could not read the selected track references: " + exception.getMessage();
            }
        }

        @android.webkit.JavascriptInterface
        public synchronized String linkTrack(String sourceTrackId, String targetTrackId) {
            SharedPreferences preferences = getSharedPreferences(MEDIA_URI_PREFERENCES, MODE_PRIVATE);
            String uri = preferences.getString("uri:" + sourceTrackId, null);
            if (uri == null) return "Android no longer has access to the selected audio file. Select it again.";
            if (sourceTrackId.equals(targetTrackId)) return "";
            boolean saved = preferences.edit()
                    .putString("uri:" + targetTrackId, uri)
                    .remove("uri:" + sourceTrackId)
                    .commit();
            return saved ? "" : "Android could not update the selected track reference.";
        }

        @android.webkit.JavascriptInterface
        public synchronized String deleteTrack(String trackId) {
            boolean saved = getSharedPreferences(MEDIA_URI_PREFERENCES, MODE_PRIVATE)
                    .edit().remove("uri:" + trackId).commit();
            return saved ? "" : "Android could not remove the selected track reference.";
        }

        @android.webkit.JavascriptInterface
        public synchronized String getPlaybackUri(String trackId) {
            return getSharedPreferences(MEDIA_URI_PREFERENCES, MODE_PRIVATE)
                    .getString("uri:" + trackId, "");
        }

        @android.webkit.JavascriptInterface
        public void setArtwork(String trackId, String artworkBase64) {
            if (trackId == null || artworkBase64 == null || artworkBase64.length() > 1_500_000) {
                return;
            }
            File artworkFile = new File(getCacheDir(), "media-artwork-" + trackId.hashCode() + ".jpg");
            try (FileOutputStream output = new FileOutputStream(artworkFile)) {
                output.write(Base64.decode(artworkBase64, Base64.DEFAULT));
                Intent intent = new Intent(SharedPlayerActivity.this, PlaybackService.class);
                intent.setAction(PlaybackService.ACTION_SET_ARTWORK);
                intent.putExtra(PlaybackService.EXTRA_TRACK_ID, trackId);
                intent.putExtra(PlaybackService.EXTRA_ARTWORK_PATH, artworkFile.getAbsolutePath());
                runOnUiThread(() -> {
                    try {
                        startService(intent);
                    } catch (IllegalStateException exception) {
                        android.util.Log.w("OfflineMusic", "Could not update media artwork.", exception);
                    }
                });
            } catch (IOException | IllegalArgumentException | SecurityException exception) {
                android.util.Log.w("OfflineMusic", "Could not save embedded media artwork.", exception);
            }
        }

        @android.webkit.JavascriptInterface
        public void playTrack(String trackId, String title, String artist, String album, int durationMs) {
            SharedPreferences preferences = getSharedPreferences(MEDIA_URI_PREFERENCES, MODE_PRIVATE);
            String uri = preferences.getString("uri:" + trackId, null);
            if (uri == null) {
                try {
                    JSONObject failure = new JSONObject()
                            .put("state", "error")
                            .put("trackId", trackId)
                            .put("positionMs", 0)
                            .put("failure", new JSONObject().put(
                                    "message", "Android no longer has access to this audio file. Select it again."
                            ));
                    dispatchWindowEvent("offline-music-native-playback", failure);
                } catch (org.json.JSONException exception) {
                    showError("Android could not report the missing audio file: " + exception.getMessage());
                }
                return;
            }
            Intent intent = new Intent(SharedPlayerActivity.this, PlaybackService.class);
            intent.setAction(PlaybackService.ACTION_PLAY);
            intent.setData(Uri.parse(uri));
            intent.putExtra(PlaybackService.EXTRA_TRACK_ID, trackId);
            intent.putExtra(PlaybackService.EXTRA_TITLE, title);
            intent.putExtra(PlaybackService.EXTRA_ARTIST, artist);
            intent.putExtra(PlaybackService.EXTRA_ALBUM, album);
            intent.putExtra(PlaybackService.EXTRA_DURATION, (long) durationMs);
            runOnUiThread(() -> startPlaybackService(intent));
        }

        @android.webkit.JavascriptInterface
        public void pausePlayback() {
            sendServiceAction(PlaybackService.ACTION_PAUSE, null);
        }

        @android.webkit.JavascriptInterface
        public void seekPlayback(int positionMs) {
            sendServiceAction(PlaybackService.ACTION_SEEK, intent ->
                    intent.putExtra(PlaybackService.EXTRA_SEEK_POSITION, Math.max(0, positionMs)));
        }

        @android.webkit.JavascriptInterface
        public void stopPlayback() {
            sendServiceAction(PlaybackService.ACTION_STOP, null);
        }

        private void sendServiceAction(String action, ServiceIntentMutator mutator) {
            runOnUiThread(() -> {
                Intent intent = new Intent(SharedPlayerActivity.this, PlaybackService.class);
                intent.setAction(action);
                if (mutator != null) mutator.apply(intent);
                startService(intent);
            });
        }
    }

    private interface ServiceIntentMutator {
        void apply(Intent intent);
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
