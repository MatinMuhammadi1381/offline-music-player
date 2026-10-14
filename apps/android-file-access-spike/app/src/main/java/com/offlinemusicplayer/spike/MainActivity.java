package com.offlinemusicplayer.spike;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.provider.MediaStore;
import android.webkit.MimeTypeMap;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class MainActivity extends Activity {
    private static final int REQUEST_FILES = 10;
    private static final int REQUEST_FOLDER = 11;
    private static final int REQUEST_NOTIFICATIONS = 12;
    private static final int REQUEST_BACKUP_EXPORT = 13;
    private static final int REQUEST_BACKUP_IMPORT = 14;
    private static final String PREFS = "file_access_spike";
    private static final String KEY_REFERENCES = "persisted_references";
    private static final int BACKUP_READ_BUFFER_SIZE = 8 * 1024;

    private final ArrayList<TrackReference> references = new ArrayList<>();
    private final ArrayList<String> spinnerLabels = new ArrayList<>();
    private final ArrayList<Uri> trackUris = new ArrayList<>();
    private final ArrayList<String> trackNames = new ArrayList<>();

    private TextView accessStatus;
    private TextView libraryStatus;
    private TextView settingsStatus;
    private TextView playbackStatus;
    private TextView deviceStatus;
    private Spinner trackPicker;
    private SeekBar seekBar;
    private ArrayAdapter<String> trackAdapter;
    private PlaybackService playbackService;
    private boolean serviceBound;
    private LibraryMetadataDatabase libraryDatabase;

    private final PlaybackService.StatusListener statusListener = this::showPlaybackStatus;

    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder binder) {
            playbackService = ((PlaybackService.LocalBinder) binder).getService();
            serviceBound = true;
            playbackService.setStatusListener(statusListener);
            showPlaybackStatus(playbackService.getStatus());
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            serviceBound = false;
            playbackService = null;
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        restoreReferences();
        libraryDatabase = new LibraryMetadataDatabase(this);
        buildScreen();
        checkNotificationPermission();
        displayPersistedReferences();
        displayLibraryStatus();
        displaySettingsStatus();
    }

    @Override
    protected void onStart() {
        super.onStart();
        bindService(new Intent(this, PlaybackService.class), serviceConnection, Context.BIND_AUTO_CREATE);
    }

    @Override
    protected void onStop() {
        if (serviceBound) {
            playbackService.setStatusListener(null);
            unbindService(serviceConnection);
            serviceBound = false;
        }
        super.onStop();
    }

    private void buildScreen() {
        int horizontal = dp(20);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(horizontal, dp(28), horizontal, dp(28));
        content.setBackgroundColor(0xFF070B14);

        TextView title = label(getString(R.string.screen_title), 28, 0xFFF5F7FB);
        content.addView(title);
        content.addView(label(getString(R.string.screen_eyebrow), 12, 0xFF72B7FF));
        content.addView(label(
                getString(R.string.screen_intro),
                16, 0xFFA7B2C4
        ));

        content.addView(sectionTitle(getString(R.string.choose_audio)));
        addButton(content, getString(R.string.select_audio_files), this::openFilePicker);
        addButton(content, getString(R.string.select_music_folder), this::openFolderPicker);
        trackPicker = new Spinner(this);
        trackAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, spinnerLabels);
        trackAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        trackPicker.setAdapter(trackAdapter);
        content.addView(trackPicker, matchWrap(dp(56)));
        addButton(content, getString(R.string.play_selected_audio), this::playSelectedTrack);
        addButton(content, getString(R.string.previous_track), this::skipToPrevious);
        seekBar = new SeekBar(this);
        seekBar.setMax(1_000);
        seekBar.setContentDescription(getString(R.string.seek_playback));
        seekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar bar, int progress, boolean fromUser) {
                if (!fromUser || playbackService == null) return;
                int duration = playbackService.getDurationMs();
                if (duration > 0) playbackService.seekTo((int) (duration * (progress / 1_000.0)));
            }

            @Override
            public void onStartTrackingTouch(SeekBar bar) {}

            @Override
            public void onStopTrackingTouch(SeekBar bar) {}
        });
        content.addView(seekBar, matchWrap(dp(52)));
        addButton(content, getString(R.string.next_track), this::skipToNext);
        addButton(content, getString(R.string.stop_playback), this::stopPlayback);

        content.addView(sectionTitle(getString(R.string.results_heading)));
        accessStatus = label(getString(R.string.initial_selection_status), 15, 0xFFA7B2C4);
        content.addView(accessStatus);
        libraryStatus = label("", 15, 0xFF72B7FF);
        content.addView(libraryStatus);
        addButton(content, getString(R.string.export_metadata_backup), this::chooseBackupExport);
        addButton(content, getString(R.string.import_metadata_backup), this::chooseBackupImport);
        playbackStatus = label(getString(R.string.initial_playback_status), 15, 0xFFA7B2C4);
        content.addView(playbackStatus);
        addButton(content, getString(R.string.recheck_file_access), this::displayPersistedReferences);
        addButton(content, getString(R.string.check_notification_permission), this::checkNotificationPermission);

        content.addView(sectionTitle(getString(R.string.player_settings_heading)));
        settingsStatus = label("", 15, 0xFFA7B2C4);
        content.addView(settingsStatus);
        addButton(content, getString(R.string.toggle_shuffle_setting), () -> updateSetting("shuffleEnabled"));
        addButton(content, getString(R.string.cycle_repeat_setting), () -> updateSetting("repeatMode"));
        addButton(content, getString(R.string.toggle_sort_setting), () -> updateSetting("librarySort"));

        content.addView(sectionTitle(getString(R.string.device_details_heading)));
        deviceStatus = label("", 14, 0xFFA7B2C4);
        content.addView(deviceStatus);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.addView(content);
        setContentView(scroll);

        String securityPatch = getString(R.string.security_patch, Build.VERSION.SECURITY_PATCH);
        deviceStatus.setText(getString(
                R.string.device_details,
                Build.MANUFACTURER,
                Build.MODEL,
                Build.VERSION.RELEASE,
                Build.VERSION.SDK_INT,
                securityPatch,
                appVersion()
        ));
    }

    private TextView sectionTitle(String text) {
        TextView view = label(text, 19, 0xFFF5F7FB);
        view.setPadding(0, dp(22), 0, dp(6));
        return view;
    }

    private TextView label(String text, int sp, int color) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(sp);
        view.setTextColor(color);
        view.setPadding(0, dp(7), 0, dp(7));
        return view;
    }

    private void addButton(LinearLayout parent, String text, Runnable action) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setMinHeight(dp(48));
        button.setOnClickListener(view -> action.run());
        parent.addView(button, matchWrap(dp(52)));
    }

    private LinearLayout.LayoutParams matchWrap(int height) {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, height);
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private String appVersion() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException exception) {
            return getString(R.string.version_unavailable, exception.getMessage());
        }
    }

    private void openFilePicker() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("audio/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        launchPicker(intent, REQUEST_FILES);
    }

    private void openFolderPicker() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        launchPicker(intent, REQUEST_FOLDER);
    }

    private void launchPicker(Intent intent, int requestCode) {
        try {
            startActivityForResult(intent, requestCode);
        } catch (ActivityNotFoundException exception) {
            accessStatus.setText(getString(R.string.picker_unavailable, exception.getMessage()));
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_BACKUP_EXPORT || requestCode == REQUEST_BACKUP_IMPORT) {
            handleBackupResult(requestCode, resultCode, data);
            return;
        }
        if (resultCode != RESULT_OK || data == null || data.getData() == null && data.getClipData() == null) {
            if (requestCode == REQUEST_FILES || requestCode == REQUEST_FOLDER) {
                accessStatus.setText(R.string.selection_cancelled);
            }
            return;
        }

        int accessFlags = data.getFlags()
                & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        if ((accessFlags & Intent.FLAG_GRANT_READ_URI_PERMISSION) == 0) {
            accessStatus.setText(R.string.read_permission_missing);
            return;
        }

        if (requestCode == REQUEST_FILES) {
            addSelectedFiles(data, accessFlags);
        } else if (requestCode == REQUEST_FOLDER) {
            addSelectedFolder(data.getData(), accessFlags);
        }
    }

    private void addSelectedFiles(Intent data, int accessFlags) {
        LinkedHashSet<Uri> selected = new LinkedHashSet<>();
        if (data.getClipData() != null) {
            for (int index = 0; index < data.getClipData().getItemCount(); index++) {
                selected.add(data.getClipData().getItemAt(index).getUri());
            }
        }
        if (data.getData() != null) selected.add(data.getData());

        int saved = 0;
        int rejected = 0;
        for (Uri uri : selected) {
            if (takePersistableReadPermission(uri, accessFlags)) {
                addReference(uri, false);
                saved++;
            } else {
                rejected++;
            }
        }
        saveReferences();
        persistSelectedTrackMetadata(selected);
        displayPersistedReferences();
        String rejectedStatus = rejected == 0
                ? "" : getResources().getQuantityString(R.plurals.rejected_file_permissions, rejected, rejected);
        accessStatus.setText(getResources().getQuantityString(
                R.plurals.saved_file_permissions, saved, saved, rejectedStatus
        ));
    }

    private void addSelectedFolder(Uri treeUri, int accessFlags) {
        if (!takePersistableReadPermission(treeUri, accessFlags)) {
            accessStatus.setText(R.string.folder_permission_missing);
            return;
        }

        addReference(treeUri, true);
        int discovered = 0;
        int failedQueries = 0;
        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(
                treeUri, DocumentsContract.getTreeDocumentId(treeUri)
        );
        String[] projection = {
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_MIME_TYPE
        };
        try (Cursor cursor = getContentResolver().query(childrenUri, projection, null, null, null)) {
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    String mimeType = cursor.getString(1);
                    if (mimeType == null || !mimeType.startsWith("audio/")) continue;

                    String documentId = cursor.getString(0);
                    Uri childUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, documentId);
                    addReference(childUri, false);
                    discovered++;
                }
            }
        } catch (SecurityException | IllegalArgumentException exception) {
            failedQueries++;
        }

        saveReferences();
        persistSelectedTrackMetadata(trackUrisFromReferences());
        displayPersistedReferences();
        String queryStatus = failedQueries == 0 ? "" : getString(R.string.folder_query_failed);
        String audioCount = getResources().getQuantityString(
                R.plurals.folder_audio_count, discovered, discovered
        );
        accessStatus.setText(getString(
                R.string.saved_folder_summary,
                audioCount,
                queryStatus,
                getString(R.string.folder_subfolders_omitted)
        ));
    }

    private boolean takePersistableReadPermission(Uri uri, int accessFlags) {
        try {
            getContentResolver().takePersistableUriPermission(uri, accessFlags & Intent.FLAG_GRANT_READ_URI_PERMISSION);
            return hasReadAccess(uri);
        } catch (SecurityException exception) {
            return false;
        }
    }

    private boolean hasReadAccess(Uri uri) {
        try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            return cursor != null;
        } catch (SecurityException | IllegalArgumentException exception) {
            return false;
        }
    }

    private void addReference(Uri uri, boolean folder) {
        String encoded = uri.toString();
        for (TrackReference reference : references) {
            if (reference.uri.toString().equals(encoded)) return;
        }
        references.add(new TrackReference(uri, folder));
    }

    private void restoreReferences() {
        SharedPreferences preferences = getSharedPreferences(PREFS, MODE_PRIVATE);
        String saved = preferences.getString(KEY_REFERENCES, "[]");
        try {
            JSONArray json = new JSONArray(saved);
            for (int index = 0; index < json.length(); index++) {
                org.json.JSONObject entry = json.getJSONObject(index);
                addReference(
                        Uri.parse(entry.getString("uri")),
                        entry.getBoolean("folder")
                );
            }
        } catch (JSONException exception) {
            references.clear();
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().remove(KEY_REFERENCES).apply();
        }
    }

    private void saveReferences() {
        JSONArray json = new JSONArray();
        for (TrackReference reference : references) {
            org.json.JSONObject entry = new org.json.JSONObject();
            try {
                entry.put("uri", reference.uri.toString());
                entry.put("folder", reference.folder);
                json.put(entry);
            } catch (JSONException exception) {
                accessStatus.setText(R.string.preference_save_failed);
            }
        }
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY_REFERENCES, json.toString()).apply();
    }

    private List<Uri> trackUrisFromReferences() {
        ArrayList<Uri> uris = new ArrayList<>();
        for (TrackReference reference : references) {
            if (!reference.folder) uris.add(reference.uri);
        }
        return uris;
    }

    private void persistSelectedTrackMetadata(Iterable<Uri> selectedUris) {
        try {
            JSONObject savedLibrary = new JSONObject(libraryDatabase.loadLibraryJson());
            JSONArray tracks = savedLibrary.getJSONArray("tracks");
            Set<String> existingIds = new LinkedHashSet<>();
            for (int index = 0; index < tracks.length(); index++) {
                existingIds.add(tracks.getJSONObject(index).getString("id"));
            }

            int added = 0;
            for (Uri uri : selectedUris) {
                String id = stableTrackId(uri);
                if (!existingIds.add(id)) continue;
                JSONObject track = createTrackMetadata(uri, id);
                if (track != null) {
                    tracks.put(track);
                    added++;
                }
            }
            if (added > 0) {
                libraryDatabase.saveLibraryJson(savedLibrary.toString());
            }
            displayLibraryStatus();
            if (added > 0) {
                libraryStatus.setText(getResources().getQuantityString(
                        R.plurals.metadata_tracks_added, added, added
                ));
            }
        } catch (JSONException | NoSuchAlgorithmException | SecurityException exception) {
            libraryStatus.setText(getString(R.string.metadata_save_failed, exception.getMessage()));
        }
    }

    private JSONObject createTrackMetadata(Uri uri, String id) throws JSONException {
        String fileName = readDisplayName(uri);
        long fileSize = readFileSize(uri);
        String mimeType = getContentResolver().getType(uri);
        String title = fileName.replaceFirst("\\.[^.]+$", "").trim();
        if (title.isEmpty()) title = fileName;

        JSONObject track = new JSONObject();
        track.put("id", id);
        track.put("title", title);
        track.put("fileName", fileName);
        track.put("fileSizeBytes", Math.max(fileSize, 0));
        track.put("addedAt", System.currentTimeMillis());
        if (mimeType != null && !mimeType.trim().isEmpty()) track.put("mimeType", mimeType);
        return track;
    }

    private long readFileSize(Uri uri) {
        try (Cursor cursor = getContentResolver().query(
                uri, new String[]{OpenableColumns.SIZE}, null, null, null
        )) {
            if (cursor != null && cursor.moveToFirst()) {
                int column = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (column >= 0 && !cursor.isNull(column)) return Math.max(cursor.getLong(column), 0);
            }
        } catch (SecurityException | IllegalArgumentException ignored) {
            return 0;
        }
        return 0;
    }

    private String stableTrackId(Uri uri) throws NoSuchAlgorithmException {
        byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(uri.toString().getBytes(StandardCharsets.UTF_8));
        StringBuilder output = new StringBuilder("android-");
        for (int index = 0; index < 16; index++) {
            output.append(String.format(Locale.ROOT, "%02x", digest[index] & 0xff));
        }
        return output.toString();
    }

    private void displayLibraryStatus() {
        if (libraryStatus == null || libraryDatabase == null) return;
        try {
            JSONObject library = new JSONObject(libraryDatabase.loadLibraryJson());
            libraryStatus.setText(getString(
                    R.string.metadata_library_status,
                    getResources().getQuantityString(
                            R.plurals.metadata_track_count, library.getJSONArray("tracks").length(),
                            library.getJSONArray("tracks").length()
                    ),
                    getResources().getQuantityString(
                            R.plurals.metadata_playlist_count, library.getJSONArray("playlists").length(),
                            library.getJSONArray("playlists").length()
                    )
            ));
        } catch (JSONException exception) {
            libraryStatus.setText(getString(R.string.metadata_load_failed, exception.getMessage()));
        }
    }

    private void displaySettingsStatus() {
        if (settingsStatus == null || libraryDatabase == null) return;
        try {
            JSONObject settings = new JSONObject(libraryDatabase.loadSettingsJson());
            JSONObject sort = settings.getJSONObject("librarySort");
            settingsStatus.setText(getString(
                    R.string.player_settings_summary,
                    sort.getString("field"),
                    sort.getString("direction"),
                    settings.getString("repeatMode"),
                    settings.getBoolean("shuffleEnabled")
            ));
        } catch (JSONException exception) {
            settingsStatus.setText(getString(R.string.player_settings_load_failed, exception.getMessage()));
        }
    }

    private void updateSetting(String setting) {
        try {
            JSONObject settings = new JSONObject(libraryDatabase.loadSettingsJson());
            if ("shuffleEnabled".equals(setting)) {
                settings.put("shuffleEnabled", !settings.getBoolean("shuffleEnabled"));
            } else if ("repeatMode".equals(setting)) {
                String current = settings.getString("repeatMode");
                String next = "off".equals(current) ? "queue" : "queue".equals(current) ? "track" : "off";
                settings.put("repeatMode", next);
            } else if ("librarySort".equals(setting)) {
                JSONObject sort = settings.getJSONObject("librarySort");
                String current = sort.getString("direction");
                sort.put("direction", "ascending".equals(current) ? "descending" : "ascending");
            } else {
                throw new IllegalArgumentException("Unsupported player setting: " + setting);
            }
            libraryDatabase.saveSettingsJson(settings.toString());
            displaySettingsStatus();
        } catch (JSONException exception) {
            settingsStatus.setText(getString(R.string.player_settings_save_failed, exception.getMessage()));
        }
    }

    private void chooseBackupExport() {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, "offline-music-player-backup.json");
        launchPicker(intent, REQUEST_BACKUP_EXPORT);
    }

    private void chooseBackupImport() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        launchPicker(intent, REQUEST_BACKUP_IMPORT);
    }

    private void handleBackupResult(int requestCode, int resultCode, Intent data) {
        if (resultCode != RESULT_OK) {
            libraryStatus.setText(R.string.backup_cancelled);
            return;
        }
        if (data == null || data.getData() == null) {
            libraryStatus.setText(R.string.backup_file_missing);
            return;
        }

        Uri destination = data.getData();
        if (requestCode == REQUEST_BACKUP_EXPORT) {
            exportMetadataBackup(destination);
        } else {
            importMetadataBackup(destination);
        }
    }

    private void exportMetadataBackup(Uri destination) {
        try {
            String backup = MetadataBackupCodec.createBackup(libraryDatabase.loadLibraryJson());
            try (OutputStream output = getContentResolver().openOutputStream(destination, "wt")) {
                if (output == null) throw new IOException(getString(R.string.backup_file_unavailable));
                output.write(backup.getBytes(StandardCharsets.UTF_8));
                output.flush();
            }
            libraryStatus.setText(R.string.backup_export_succeeded);
        } catch (IOException | JSONException | SecurityException exception) {
            libraryStatus.setText(getString(R.string.backup_export_failed, exception.getMessage()));
        }
    }

    private void importMetadataBackup(Uri source) {
        try {
            String backup;
            try (InputStream input = getContentResolver().openInputStream(source)) {
                if (input == null) throw new IOException(getString(R.string.backup_file_unavailable));
                backup = readLimited(input);
            }
            String validatedLibrary = MetadataBackupCodec.validateBackup(backup);
            libraryDatabase.saveLibraryJson(validatedLibrary);
            displayLibraryStatus();
            libraryStatus.setText(R.string.backup_import_succeeded);
        } catch (IOException | JSONException | SecurityException exception) {
            libraryStatus.setText(getString(R.string.backup_import_failed, exception.getMessage()));
        }
    }

    private String readLimited(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[BACKUP_READ_BUFFER_SIZE];
        int total = 0;
        int read;
        while ((read = input.read(buffer)) != -1) {
            total += read;
            if (total > MetadataBackupCodec.MAX_BYTES) {
                throw new IOException(getString(R.string.backup_too_large));
            }
            output.write(buffer, 0, read);
        }
        return new String(output.toByteArray(), StandardCharsets.UTF_8);
    }

    private void displayPersistedReferences() {
        if (accessStatus == null) return;

        Set<String> granted = new LinkedHashSet<>();
        for (android.content.UriPermission permission : getContentResolver().getPersistedUriPermissions()) {
            if (permission.isReadPermission()) granted.add(permission.getUri().toString());
        }

        trackUris.clear();
        trackNames.clear();
        int reachable = 0;
        int inaccessible = 0;
        int folders = 0;
        for (TrackReference reference : references) {
            if (reference.folder) folders++;
            boolean persisted = granted.contains(reference.uri.toString())
                    || hasTreePermission(reference.uri, granted);
            boolean openable = persisted && hasReadAccess(reference.uri);
            if (openable && !reference.folder) {
                reachable++;
                trackUris.add(reference.uri);
                trackNames.add(readDisplayName(reference.uri));
            } else if (!openable) {
                inaccessible++;
            }
        }

        spinnerLabels.clear();
        for (int index = 0; index < trackNames.size(); index++) {
            spinnerLabels.add(trackNames.get(index));
        }
        if (trackAdapter != null) trackAdapter.notifyDataSetChanged();
        if (trackPicker != null) trackPicker.setEnabled(!trackNames.isEmpty());
        accessStatus.setText(getString(
                R.string.persisted_reference_summary,
                references.size(),
                reachable,
                folders,
                inaccessible
        ));
    }

    private boolean hasTreePermission(Uri childUri, Set<String> granted) {
        try {
            String treeDocumentId = DocumentsContract.getTreeDocumentId(childUri);
            for (String encoded : granted) {
                Uri treeUri = Uri.parse(encoded);
                if (treeUri.getAuthority().equals(childUri.getAuthority())
                        && DocumentsContract.getTreeDocumentId(treeUri).equals(treeDocumentId)) {
                    return true;
                }
            }
        } catch (IllegalArgumentException exception) {
            return false;
        }
        return false;
    }

    private String readDisplayName(Uri uri) {
        String fallback = getString(R.string.selected_file_fallback, trackNames.size() + 1);
        try (Cursor cursor = getContentResolver().query(
                uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null
        )) {
            if (cursor != null && cursor.moveToFirst()) {
                int column = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (column >= 0) {
                    String name = cursor.getString(column);
                    if (name != null && !name.isEmpty()) return name;
                }
            }
        } catch (SecurityException | IllegalArgumentException ignored) {
            return fallback;
        }
        return fallback;
    }

    private void playSelectedTrack() {
        int selected = trackPicker.getSelectedItemPosition();
        if (selected < 0 || selected >= trackUris.size()) {
            accessStatus.setText(R.string.no_playable_files);
            return;
        }

        requestNotificationPermissionIfNeeded();
        Intent intent = new Intent(this, PlaybackService.class);
        intent.setAction(PlaybackService.ACTION_PLAY);
        intent.setData(trackUris.get(selected));
        ArrayList<String> queue = new ArrayList<>();
        for (Uri uri : trackUris) queue.add(uri.toString());
        intent.putStringArrayListExtra(PlaybackService.EXTRA_QUEUE, queue);
        intent.putExtra(PlaybackService.EXTRA_QUEUE_INDEX, selected);
        try {
            JSONObject settings = new JSONObject(libraryDatabase.loadSettingsJson());
            intent.putExtra(PlaybackService.EXTRA_REPEAT_MODE, settings.getString("repeatMode"));
            intent.putExtra(PlaybackService.EXTRA_SHUFFLE_ENABLED, settings.getBoolean("shuffleEnabled"));
        } catch (JSONException exception) {
            accessStatus.setText(getString(R.string.player_settings_load_failed, exception.getMessage()));
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }
        accessStatus.setText(R.string.playback_requested);
    }

    private void skipToNext() {
        sendPlaybackAction(PlaybackService.ACTION_NEXT);
    }

    private void skipToPrevious() {
        sendPlaybackAction(PlaybackService.ACTION_PREVIOUS);
    }

    private void sendPlaybackAction(String action) {
        Intent intent = new Intent(this, PlaybackService.class);
        intent.setAction(action);
        startService(intent);
    }

    private void stopPlayback() {
        sendPlaybackAction(PlaybackService.ACTION_STOP);
        playbackStatus.setText(R.string.stop_requested);
    }

    private void checkNotificationPermission() {
        if (Build.VERSION.SDK_INT < 33) {
            accessStatus.setText(R.string.notification_permission_not_required);
        } else if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            accessStatus.setText(R.string.notification_permission_granted);
        } else {
            accessStatus.setText(R.string.notification_permission_missing);
        }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, REQUEST_NOTIFICATIONS);
        }
    }

    private void showPlaybackStatus(String status) {
        if (playbackStatus != null) playbackStatus.setText(status);
    }

    private static final class TrackReference {
        final Uri uri;
        final boolean folder;

        TrackReference(Uri uri, boolean folder) {
            this.uri = uri;
            this.folder = folder;
        }
    }
}
