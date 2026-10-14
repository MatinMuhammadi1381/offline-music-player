package com.offlinemusicplayer.spike;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.TimeZone;

final class MetadataBackupCodec {
    static final int MAX_BYTES = 10 * 1024 * 1024;
    private static final String FORMAT = "offline-music-player-library";
    private static final int VERSION = 1;
    private static final int MAX_TRACKS = 50_000;
    private static final int MAX_PLAYLISTS = 10_000;
    private static final int MAX_TEXT_LENGTH = 4_096;
    private static final double MAX_SAFE_INTEGER = 9_007_199_254_740_991d;

    private MetadataBackupCodec() {}

    static String emptyLibraryJson() {
        return "{\"schemaVersion\":1,\"tracks\":[],\"playlists\":[]}";
    }

    static String defaultSettingsJson() {
        return "{\"schemaVersion\":1,\"librarySort\":{\"field\":\"title\",\"direction\":\"ascending\"},"
                + "\"repeatMode\":\"off\",\"shuffleEnabled\":false}";
    }

    static String validateSettingsJson(String input) throws JSONException {
        JSONObject settings;
        try {
            settings = new JSONObject(input);
        } catch (JSONException exception) {
            throw new JSONException("The stored player settings are not valid JSON: " + exception.getMessage());
        }
        requireOnlyKeys(
                settings,
                new String[]{"schemaVersion", "librarySort", "repeatMode", "shuffleEnabled"},
                "settings"
        );
        if (!isSafeInteger(settings.opt("schemaVersion"), 1)) {
            throw new JSONException("settings.schemaVersion must be 1.");
        }
        Object rawSort = settings.opt("librarySort");
        if (!(rawSort instanceof JSONObject)) {
            throw new JSONException("settings.librarySort must be an object.");
        }
        JSONObject sort = (JSONObject) rawSort;
        requireOnlyKeys(sort, new String[]{"field", "direction"}, "settings.librarySort");
        String field = sort.optString("field");
        String direction = sort.optString("direction");
        if (!"title".equals(field) && !"artist".equals(field)
                && !"album".equals(field) && !"addedAt".equals(field)) {
            throw new JSONException("settings.librarySort.field is not supported.");
        }
        if (!"ascending".equals(direction) && !"descending".equals(direction)) {
            throw new JSONException("settings.librarySort.direction is not supported.");
        }
        String repeatMode = settings.optString("repeatMode");
        if (!"off".equals(repeatMode) && !"queue".equals(repeatMode) && !"track".equals(repeatMode)) {
            throw new JSONException("settings.repeatMode is not supported.");
        }
        Object rawShuffle = settings.opt("shuffleEnabled");
        if (!(rawShuffle instanceof Boolean)) {
            throw new JSONException("settings.shuffleEnabled must be a boolean.");
        }
        JSONObject normalizedSort = new JSONObject();
        normalizedSort.put("field", field);
        normalizedSort.put("direction", direction);
        JSONObject normalized = new JSONObject();
        normalized.put("schemaVersion", 1);
        normalized.put("librarySort", normalizedSort);
        normalized.put("repeatMode", repeatMode);
        normalized.put("shuffleEnabled", rawShuffle);
        return normalized.toString();
    }

    static String createBackup(String libraryJson) throws JSONException {
        JSONObject library = new JSONObject(validateLibraryJson(libraryJson));
        String timestamp = isoTimestamp(System.currentTimeMillis());
        JSONObject backup = new JSONObject();
        backup.put("format", FORMAT);
        backup.put("version", VERSION);
        backup.put("exportedAt", timestamp);
        backup.put("library", library);
        String result = backup.toString();
        if (result.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new JSONException("The metadata backup exceeds the 10 MB safety limit.");
        }
        return result;
    }

    static String validateBackup(String input) throws JSONException {
        if (input.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new JSONException("The metadata backup exceeds the 10 MB safety limit.");
        }
        JSONObject backup;
        try {
            backup = new JSONObject(input);
        } catch (JSONException exception) {
            throw new JSONException("The selected backup is not valid JSON: " + exception.getMessage());
        }
        requireOnlyKeys(backup, new String[]{"format", "version", "exportedAt", "library"}, "backup");
        if (!FORMAT.equals(backup.optString("format"))
                || !isSafeInteger(backup.opt("version"), VERSION)) {
            throw new JSONException("This metadata backup format or version is not supported.");
        }
        requireIsoTimestamp(backup.optString("exportedAt"), "backup.exportedAt");
        if (!(backup.opt("library") instanceof JSONObject)) {
            throw new JSONException("backup.library must be an object.");
        }
        return validateLibraryJson(backup.getJSONObject("library").toString());
    }

    static String validateLibraryJson(String input) throws JSONException {
        if (input.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new JSONException("The metadata library exceeds the 10 MB safety limit.");
        }
        JSONObject library;
        try {
            library = new JSONObject(input);
        } catch (JSONException exception) {
            throw new JSONException("The stored metadata is not valid JSON: " + exception.getMessage());
        }
        requireOnlyKeys(library, new String[]{"schemaVersion", "tracks", "playlists"}, "library");
        if (!isSafeInteger(library.opt("schemaVersion"), 1)) {
            throw new JSONException("library.schemaVersion must be 1.");
        }
        if (!(library.opt("tracks") instanceof JSONArray) || !(library.opt("playlists") instanceof JSONArray)) {
            throw new JSONException("library.tracks and library.playlists must be arrays.");
        }
        JSONArray rawTracks = library.getJSONArray("tracks");
        JSONArray rawPlaylists = library.getJSONArray("playlists");
        if (rawTracks.length() > MAX_TRACKS || rawPlaylists.length() > MAX_PLAYLISTS) {
            throw new JSONException("The library exceeds the supported metadata entry limits.");
        }

        HashSet<String> trackIds = new HashSet<>();
        JSONArray tracks = new JSONArray();
        String[] trackKeys = {
                "id", "title", "artist", "album", "durationMs", "mimeType",
                "fileName", "fileSizeBytes", "addedAt", "lastPlayedAt"
        };
        for (int index = 0; index < rawTracks.length(); index++) {
            Object raw = rawTracks.get(index);
            if (!(raw instanceof JSONObject)) throw new JSONException("library.tracks[" + index + "] must be an object.");
            JSONObject track = (JSONObject) raw;
            requireOnlyKeys(track, trackKeys, "library.tracks[" + index + "]");
            String id = requiredText(track, "id", 256);
            if (!trackIds.add(id)) throw new JSONException("Duplicate track ID: " + id);
            String title = requiredText(track, "title", MAX_TEXT_LENGTH);
            String fileName = requiredText(track, "fileName", MAX_TEXT_LENGTH);
            long fileSize = requiredInteger(track, "fileSizeBytes");
            if (fileSize < 0) throw new JSONException("Track fileSizeBytes cannot be negative.");
            long addedAt = requiredInteger(track, "addedAt");
            if (addedAt < 0) throw new JSONException("Track addedAt cannot be negative.");

            JSONObject normalized = new JSONObject();
            normalized.put("id", id);
            normalized.put("title", title);
            normalized.put("fileName", fileName);
            normalized.put("fileSizeBytes", fileSize);
            normalized.put("addedAt", addedAt);
            putOptionalText(track, normalized, "artist");
            putOptionalText(track, normalized, "album");
            putOptionalText(track, normalized, "mimeType");
            putOptionalInteger(track, normalized, "durationMs");
            putOptionalInteger(track, normalized, "lastPlayedAt");
            tracks.put(normalized);
        }

        HashSet<String> playlistIds = new HashSet<>();
        JSONArray playlists = new JSONArray();
        String[] playlistKeys = {"id", "name", "trackIds", "createdAt", "updatedAt"};
        for (int index = 0; index < rawPlaylists.length(); index++) {
            Object raw = rawPlaylists.get(index);
            if (!(raw instanceof JSONObject)) throw new JSONException("library.playlists[" + index + "] must be an object.");
            JSONObject playlist = (JSONObject) raw;
            requireOnlyKeys(playlist, playlistKeys, "library.playlists[" + index + "]");
            String id = requiredText(playlist, "id", 256);
            if (!playlistIds.add(id)) throw new JSONException("Duplicate playlist ID: " + id);
            String name = requiredText(playlist, "name", MAX_TEXT_LENGTH);
            long createdAt = requiredInteger(playlist, "createdAt");
            long updatedAt = requiredInteger(playlist, "updatedAt");
            if (createdAt < 0 || updatedAt < createdAt) throw new JSONException("Playlist timestamps are invalid.");
            if (!(playlist.opt("trackIds") instanceof JSONArray)) throw new JSONException("Playlist trackIds must be an array.");
            JSONArray rawIds = playlist.getJSONArray("trackIds");
            if (rawIds.length() > MAX_TRACKS) throw new JSONException("A playlist exceeds the supported track limit.");
            JSONArray trackReferences = new JSONArray();
            HashSet<String> members = new HashSet<>();
            for (int member = 0; member < rawIds.length(); member++) {
                Object entry = rawIds.get(member);
                if (!(entry instanceof String) || ((String) entry).trim().isEmpty()) {
                    throw new JSONException("Playlist track IDs must be non-empty strings.");
                }
                String trackId = (String) entry;
                if (!members.add(trackId)) throw new JSONException("Playlist contains duplicate track ID: " + trackId);
                if (!trackIds.contains(trackId)) throw new JSONException("Playlist refers to a missing track ID: " + trackId);
                trackReferences.put(trackId);
            }
            JSONObject normalized = new JSONObject();
            normalized.put("id", id);
            normalized.put("name", name);
            normalized.put("trackIds", trackReferences);
            normalized.put("createdAt", createdAt);
            normalized.put("updatedAt", updatedAt);
            playlists.put(normalized);
        }

        JSONObject normalized = new JSONObject();
        normalized.put("schemaVersion", 1);
        normalized.put("tracks", tracks);
        normalized.put("playlists", playlists);
        return normalized.toString();
    }

    private static void requireOnlyKeys(JSONObject object, String[] allowed, String path) throws JSONException {
        JSONArray names = object.names();
        if (names == null) return;
        for (int index = 0; index < names.length(); index++) {
            String name = names.getString(index);
            boolean accepted = false;
            for (String key : allowed) {
                if (key.equals(name)) {
                    accepted = true;
                    break;
                }
            }
            if (!accepted) throw new JSONException(path + "." + name + " is not supported.");
        }
    }

    private static String requiredText(JSONObject object, String key, int limit) throws JSONException {
        Object raw = object.opt(key);
        if (!(raw instanceof String)) throw new JSONException(key + " must be a string.");
        String value = (String) raw;
        if (value.trim().isEmpty() || value.length() > limit) throw new JSONException(key + " is empty or too long.");
        return value;
    }

    private static long requiredInteger(JSONObject object, String key) throws JSONException {
        Object raw = object.opt(key);
        if (!(raw instanceof Number) || !isSafeInteger(raw, null)) {
            throw new JSONException(key + " must be a non-negative safe integer.");
        }
        return ((Number) raw).longValue();
    }

    private static boolean isSafeInteger(Object raw, Integer expected) {
        if (!(raw instanceof Number)) return false;
        double value = ((Number) raw).doubleValue();
        if (!Double.isFinite(value) || value < 0 || value > MAX_SAFE_INTEGER || value != Math.rint(value)) {
            return false;
        }
        return expected == null || value == expected;
    }

    private static void putOptionalText(JSONObject input, JSONObject output, String key) throws JSONException {
        if (!input.has(key)) return;
        Object value = input.opt(key);
        if (!(value instanceof String) || ((String) value).length() > MAX_TEXT_LENGTH) {
            throw new JSONException(key + " must be a string when present.");
        }
        output.put(key, value);
    }

    private static void putOptionalInteger(JSONObject input, JSONObject output, String key) throws JSONException {
        if (!input.has(key)) return;
        long value = requiredInteger(input, key);
        output.put(key, value);
    }

    private static String isoTimestamp(long value) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(value));
    }

    private static void requireIsoTimestamp(String value, String path) throws JSONException {
        if (!value.matches("\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z")) {
            throw new JSONException(path + " must be an ISO 8601 UTC timestamp.");
        }
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setLenient(false);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        try {
            Date parsed = format.parse(value);
            if (parsed == null || !format.format(parsed).equals(value)) {
                throw new JSONException(path + " is invalid.");
            }
        } catch (ParseException exception) {
            throw new JSONException(path + " is invalid: " + exception.getMessage());
        }
    }
}
