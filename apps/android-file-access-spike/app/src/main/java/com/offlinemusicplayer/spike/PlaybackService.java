package com.offlinemusicplayer.spike;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;

public final class PlaybackService extends Service {
    public static final String ACTION_PLAY = "com.offlinemusicplayer.spike.action.PLAY";
    public static final String ACTION_PAUSE = "com.offlinemusicplayer.spike.action.PAUSE";
    public static final String ACTION_RESUME = "com.offlinemusicplayer.spike.action.RESUME";
    public static final String ACTION_TOGGLE = "com.offlinemusicplayer.spike.action.TOGGLE";
    public static final String ACTION_NEXT = "com.offlinemusicplayer.spike.action.NEXT";
    public static final String ACTION_PREVIOUS = "com.offlinemusicplayer.spike.action.PREVIOUS";
    public static final String ACTION_SEEK = "com.offlinemusicplayer.spike.action.SEEK";
    public static final String ACTION_STOP = "com.offlinemusicplayer.spike.action.STOP";
    public static final String EXTRA_QUEUE = "queue";
    public static final String EXTRA_QUEUE_INDEX = "queue_index";
    public static final String EXTRA_REPEAT_MODE = "repeat_mode";
    public static final String EXTRA_SHUFFLE_ENABLED = "shuffle_enabled";
    public static final String EXTRA_SEEK_POSITION = "seek_position";

    private static final String CHANNEL_ID = "music_playback";
    private static final int NOTIFICATION_ID = 34;
    private static final long MEDIA_ACTIONS = PlaybackState.ACTION_PLAY
            | PlaybackState.ACTION_PAUSE
            | PlaybackState.ACTION_PLAY_PAUSE
            | PlaybackState.ACTION_STOP
            | PlaybackState.ACTION_SEEK_TO
            | PlaybackState.ACTION_SKIP_TO_NEXT
            | PlaybackState.ACTION_SKIP_TO_PREVIOUS;

    private final IBinder binder = new LocalBinder();
    private final ArrayList<Uri> queue = new ArrayList<>();
    private MediaPlayer mediaPlayer;
    private MediaSession mediaSession;
    private StatusListener statusListener;
    private String status;
    private String repeatMode = "off";
    private int currentIndex = -1;
    private boolean shuffleEnabled;
    private boolean prepared;

    public interface StatusListener {
        void onStatusChanged(String status);
    }

    public final class LocalBinder extends Binder {
        PlaybackService getService() {
            return PlaybackService.this;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        status = getString(R.string.service_idle);
        createNotificationChannel();
        mediaSession = new MediaSession(this, "OfflineMusicPlaybackTest");
        mediaSession.setFlags(
                MediaSession.FLAG_HANDLES_MEDIA_BUTTONS
                        | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS
        );
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                resumePlayback();
            }

            @Override
            public void onPause() {
                pausePlayback();
            }

            @Override
            public void onStop() {
                stopPlayback();
            }

            @Override
            public void onSkipToNext() {
                skipToNext();
            }

            @Override
            public void onSkipToPrevious() {
                skipToPrevious();
            }

            @Override
            public void onSeekTo(long position) {
                seekTo((int) Math.min(Integer.MAX_VALUE, Math.max(0, position)));
            }
        });
        mediaSession.setActive(true);
        updatePlaybackState(PlaybackState.STATE_STOPPED);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_PLAY.equals(action)) {
            setQueueFromIntent(intent);
            startPlayback(intent.getData());
        } else if (ACTION_PAUSE.equals(action)) {
            pausePlayback();
        } else if (ACTION_RESUME.equals(action)) {
            resumePlayback();
        } else if (ACTION_TOGGLE.equals(action)) {
            togglePlayback();
        } else if (ACTION_NEXT.equals(action)) {
            skipToNext();
        } else if (ACTION_PREVIOUS.equals(action)) {
            skipToPrevious();
        } else if (ACTION_SEEK.equals(action) && intent != null) {
            seekTo(intent.getIntExtra(EXTRA_SEEK_POSITION, 0));
        } else if (ACTION_STOP.equals(action)) {
            stopPlayback();
        }
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    public String getStatus() {
        return status;
    }

    public void setStatusListener(StatusListener listener) {
        statusListener = listener;
        if (listener != null) listener.onStatusChanged(status);
    }

    public int getDurationMs() {
        return mediaPlayer != null && prepared ? mediaPlayer.getDuration() : 0;
    }

    public int getPositionMs() {
        return mediaPlayer != null && prepared ? mediaPlayer.getCurrentPosition() : 0;
    }

    public void seekTo(int positionMs) {
        if (mediaPlayer == null || !prepared) return;
        int duration = Math.max(0, mediaPlayer.getDuration());
        mediaPlayer.seekTo(Math.max(0, Math.min(positionMs, duration)));
        updatePlaybackState(mediaPlayer.isPlaying() ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED);
    }

    private void setQueueFromIntent(Intent intent) {
        queue.clear();
        ArrayList<String> encodedQueue = intent.getStringArrayListExtra(EXTRA_QUEUE);
        if (encodedQueue != null) {
            for (String encodedUri : encodedQueue) {
                if (encodedUri != null && !encodedUri.isEmpty()) queue.add(Uri.parse(encodedUri));
            }
        }
        currentIndex = intent.getIntExtra(EXTRA_QUEUE_INDEX, -1);
        repeatMode = intent.getStringExtra(EXTRA_REPEAT_MODE);
        if (!"queue".equals(repeatMode) && !"track".equals(repeatMode)) repeatMode = "off";
        shuffleEnabled = intent.getBooleanExtra(EXTRA_SHUFFLE_ENABLED, false);

        if (queue.isEmpty() && intent.getData() != null) queue.add(intent.getData());
        if (queue.isEmpty()) {
            currentIndex = -1;
            return;
        }
        if (currentIndex < 0 || currentIndex >= queue.size()) currentIndex = 0;
        if (shuffleEnabled && currentIndex + 1 < queue.size()) {
            ArrayList<Uri> played = new ArrayList<>(queue.subList(0, currentIndex));
            Uri current = queue.get(currentIndex);
            ArrayList<Uri> upcoming = new ArrayList<>(queue.subList(currentIndex + 1, queue.size()));
            Collections.shuffle(upcoming);
            queue.clear();
            queue.addAll(played);
            queue.add(current);
            queue.addAll(upcoming);
            currentIndex = played.size();
        }
    }

    private void startPlayback(Uri uri) {
        startForegroundCompat(buildNotification(getString(R.string.notification_preparing)));
        if (uri == null) {
            setStatus(getString(R.string.service_no_audio_uri));
            finishPlayback();
            return;
        }
        if (queue.isEmpty()) queue.add(uri);
        if (currentIndex < 0 || currentIndex >= queue.size() || !uri.equals(queue.get(currentIndex))) {
            currentIndex = queue.indexOf(uri);
            if (currentIndex < 0) {
                queue.add(uri);
                currentIndex = queue.size() - 1;
            }
        }

        releasePlayer();
        prepared = false;
        mediaPlayer = new MediaPlayer();
        mediaPlayer.setWakeMode(this, android.os.PowerManager.PARTIAL_WAKE_LOCK);
        mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build());
        mediaPlayer.setOnPreparedListener(player -> {
            prepared = true;
            player.start();
            setStatus(getString(R.string.service_playing));
            updatePlaybackState(PlaybackState.STATE_PLAYING);
            updateNotification(getString(R.string.notification_playing));
        });
        mediaPlayer.setOnCompletionListener(player -> {
            if ("track".equals(repeatMode)) {
                startPlayback(queue.get(currentIndex));
            } else {
                skipToNext();
            }
        });
        mediaPlayer.setOnErrorListener((player, what, extra) -> {
            setStatus(getString(R.string.service_playback_error, what, extra));
            updatePlaybackState(PlaybackState.STATE_ERROR);
            stopForegroundCompat();
            releasePlayer();
            stopSelf();
            return true;
        });

        try {
            mediaPlayer.setDataSource(this, uri);
            mediaPlayer.prepareAsync();
            setStatus(getString(R.string.service_opening));
        } catch (IOException | SecurityException | IllegalStateException exception) {
            setStatus(getString(R.string.service_open_error, exception.getMessage()));
            updatePlaybackState(PlaybackState.STATE_ERROR);
            stopForegroundCompat();
            releasePlayer();
            stopSelf();
        }
    }

    private void resumePlayback() {
        if (mediaPlayer == null || !prepared) return;
        if (!mediaPlayer.isPlaying()) mediaPlayer.start();
        setStatus(getString(R.string.service_resumed));
        updatePlaybackState(PlaybackState.STATE_PLAYING);
        updateNotification(getString(R.string.notification_playing));
    }

    private void pausePlayback() {
        if (mediaPlayer != null && prepared && mediaPlayer.isPlaying()) mediaPlayer.pause();
        setStatus(getString(R.string.service_paused));
        updatePlaybackState(PlaybackState.STATE_PAUSED);
        updateNotification(getString(R.string.notification_paused));
    }

    private void togglePlayback() {
        if (mediaPlayer != null && prepared && mediaPlayer.isPlaying()) {
            pausePlayback();
        } else {
            resumePlayback();
        }
    }

    private void skipToNext() {
        if (queue.isEmpty()) {
            finishPlayback();
            return;
        }
        if (currentIndex + 1 < queue.size()) {
            currentIndex++;
        } else if ("queue".equals(repeatMode)) {
            currentIndex = 0;
        } else {
            setStatus(getString(R.string.service_completed));
            finishPlayback();
            return;
        }
        startPlayback(queue.get(currentIndex));
    }

    private void skipToPrevious() {
        if (mediaPlayer != null && prepared && mediaPlayer.getCurrentPosition() > 3_000) {
            seekTo(0);
            return;
        }
        if (currentIndex > 0) {
            currentIndex--;
        } else if ("queue".equals(repeatMode) && !queue.isEmpty()) {
            currentIndex = queue.size() - 1;
        } else if (!queue.isEmpty()) {
            startPlayback(queue.get(currentIndex));
            return;
        } else {
            return;
        }
        startPlayback(queue.get(currentIndex));
    }

    private void stopPlayback() {
        releasePlayer();
        queue.clear();
        currentIndex = -1;
        finishPlayback();
        setStatus(getString(R.string.service_stopped));
    }

    private void finishPlayback() {
        releasePlayer();
        updatePlaybackState(PlaybackState.STATE_STOPPED);
        stopForegroundCompat();
        stopSelf();
    }

    private void releasePlayer() {
        prepared = false;
        if (mediaPlayer != null) {
            try {
                mediaPlayer.reset();
                mediaPlayer.release();
            } catch (IllegalStateException ignored) {
                mediaPlayer.release();
            }
            mediaPlayer = null;
        }
    }

    private void setStatus(String value) {
        status = value;
        if (statusListener != null) statusListener.onStatusChanged(value);
    }

    private void updatePlaybackState(int state) {
        if (mediaSession == null) return;
        mediaSession.setPlaybackState(new PlaybackState.Builder()
                .setActions(MEDIA_ACTIONS)
                .setState(state, mediaPlayer != null && prepared ? mediaPlayer.getCurrentPosition() : 0, 1.0f)
                .build());
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, getString(R.string.notification_channel_name), NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(getString(R.string.notification_channel_description));
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    private Notification buildNotification(String text) {
        Intent openApp = new Intent(this, MainActivity.class);
        PendingIntent contentIntent = PendingIntent.getActivity(
                this, 1, openApp, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        builder
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle(getString(R.string.notification_title))
                .setContentText(text)
                .setContentIntent(contentIntent)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .addAction(action(android.R.drawable.ic_media_previous, getString(R.string.notification_previous_action), ACTION_PREVIOUS, 1))
                .addAction(action(
                        mediaPlayer != null && prepared && mediaPlayer.isPlaying()
                                ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        mediaPlayer != null && prepared && mediaPlayer.isPlaying()
                                ? getString(R.string.notification_pause_action)
                                : getString(R.string.notification_resume_action),
                        mediaPlayer != null && prepared && mediaPlayer.isPlaying() ? ACTION_PAUSE : ACTION_RESUME,
                        2
                ))
                .addAction(action(android.R.drawable.ic_media_next, getString(R.string.notification_next_action), ACTION_NEXT, 3))
                .setStyle(new Notification.MediaStyle()
                        .setMediaSession(mediaSession.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2));
        return builder.build();
    }

    private Notification.Action action(int icon, String title, String action, int requestCode) {
        Intent intent = new Intent(this, PlaybackService.class);
        intent.setAction(action);
        PendingIntent pending = PendingIntent.getService(
                this, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        return new Notification.Action.Builder(icon, title, pending).build();
    }

    private void updateNotification(String text) {
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, buildNotification(text));
    }

    private void startForegroundCompat(Notification notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
    }

    @Override
    public void onDestroy() {
        releasePlayer();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }
}
