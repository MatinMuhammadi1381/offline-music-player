package com.offlinemusicplayer.spike;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import java.util.concurrent.locks.ReentrantLock;

public final class LibraryMetadataDatabase extends SQLiteOpenHelper {
    private static final String DATABASE_NAME = "library_metadata.db";
    private static final int DATABASE_VERSION = 2;
    private static final String TABLE_NAME = "library_snapshot";
    private static final String SETTINGS_TABLE_NAME = "player_settings";
    private static final int SNAPSHOT_ID = 1;
    private static final ReentrantLock WRITE_LOCK = new ReentrantLock();

    public LibraryMetadataDatabase(Context context) {
        super(context.getApplicationContext(), DATABASE_NAME, null, DATABASE_VERSION);
        setWriteAheadLoggingEnabled(true);
    }

    @Override
    public void onCreate(SQLiteDatabase database) {
        database.execSQL(
                "CREATE TABLE " + TABLE_NAME
                        + " (id INTEGER PRIMARY KEY CHECK(id = 1), metadata_json TEXT NOT NULL)"
        );
        createSettingsTable(database);
    }

    @Override
    public void onUpgrade(SQLiteDatabase database, int oldVersion, int newVersion) {
        if (oldVersion < 2) createSettingsTable(database);
        if (newVersion > DATABASE_VERSION) {
            throw new IllegalStateException("Unsupported metadata database version " + newVersion + ".");
        }
    }

    private void createSettingsTable(SQLiteDatabase database) {
        database.execSQL(
                "CREATE TABLE " + SETTINGS_TABLE_NAME
                        + " (id INTEGER PRIMARY KEY CHECK(id = 1), settings_json TEXT NOT NULL)"
        );
    }

    public String loadLibraryJson() {
        try (android.database.Cursor cursor = getReadableDatabase().query(
                TABLE_NAME,
                new String[]{"metadata_json"},
                "id = ?",
                new String[]{String.valueOf(SNAPSHOT_ID)},
                null,
                null,
                null
        )) {
            return cursor.moveToFirst() ? cursor.getString(0) : MetadataBackupCodec.emptyLibraryJson();
        }
    }

    public void saveLibraryJson(String json) throws org.json.JSONException {
        String validated = MetadataBackupCodec.validateLibraryJson(json);
        WRITE_LOCK.lock();
        try {
            SQLiteDatabase database = getWritableDatabase();
            database.beginTransaction();
            try {
                database.execSQL(
                        "INSERT OR REPLACE INTO " + TABLE_NAME + " (id, metadata_json) VALUES (?, ?)",
                        new Object[]{SNAPSHOT_ID, validated}
                );
                database.setTransactionSuccessful();
            } finally {
                database.endTransaction();
            }
        } finally {
            WRITE_LOCK.unlock();
        }
    }

    public String loadSettingsJson() {
        try (android.database.Cursor cursor = getReadableDatabase().query(
                SETTINGS_TABLE_NAME,
                new String[]{"settings_json"},
                "id = ?",
                new String[]{String.valueOf(SNAPSHOT_ID)},
                null,
                null,
                null
        )) {
            return cursor.moveToFirst() ? cursor.getString(0) : MetadataBackupCodec.defaultSettingsJson();
        }
    }

    public void saveSettingsJson(String json) throws org.json.JSONException {
        String validated = MetadataBackupCodec.validateSettingsJson(json);
        WRITE_LOCK.lock();
        try {
            SQLiteDatabase database = getWritableDatabase();
            database.beginTransaction();
            try {
                database.execSQL(
                        "INSERT OR REPLACE INTO " + SETTINGS_TABLE_NAME + " (id, settings_json) VALUES (?, ?)",
                        new Object[]{SNAPSHOT_ID, validated}
                );
                database.setTransactionSuccessful();
            } finally {
                database.endTransaction();
            }
        } finally {
            WRITE_LOCK.unlock();
        }
    }
}
