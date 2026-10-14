import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  JsonMetadataBackupService,
  LibraryController,
  PlaybackController,
  restoreMetadataBackup,
  searchTracks,
  sortTracks,
  DEFAULT_PLAYER_SETTINGS,
} from "@offline-music-player/music-core";
import type { LibraryMetadata, PlayerSettings, Playlist, SortField, TrackMetadata } from "@offline-music-player/shared-types";
import { BrowserAudioFileSource, createInputFileChooser, HtmlAudioPlaybackEngine, IndexedDbLibraryRepository } from "@offline-music-player/web-platform";
import { extractEmbeddedArtwork } from "@offline-music-player/web-platform";
import type { PlayerSnapshot, TrackIntegrity } from "@offline-music-player/music-core";
import {
  getBrowserStoragePersistenceStatus,
  requestBrowserStoragePersistence,
} from "@offline-music-player/web-platform";
import "./styles.css";

type Destination = "library" | "playlists" | "queue" | "settings" | "player";
type IconName = "library" | "playlist" | "queue" | "settings" | "play" | "pause" | "next" | "previous" | "search" | "plus" | "shuffle" | "repeat" | "close" | "music" | "back" | "download" | "upload" | "sort";
const destinations: readonly Destination[] = ["library", "playlists", "queue", "settings", "player"];

declare global {
  interface Window {
    OfflineMusicAndroid?: {
      saveMetadataBackup(backupJson: string): void;
    };
  }
}

function destinationFromHash(): Destination {
  const value = window.location.hash.slice(1);
  return destinations.includes(value as Destination) ? value as Destination : "library";
}

interface AppRuntime {
  readonly files: BrowserAudioFileSource;
  readonly repository: IndexedDbLibraryRepository;
  readonly library: LibraryController;
  readonly audio: HtmlAudioPlaybackEngine;
  readonly playback: PlaybackController;
}

interface PendingRelink {
  readonly fileName: string;
  readonly candidateTrackIds: readonly string[];
  readonly file: import("@offline-music-player/platform-contracts").SelectedAudioFile;
}

function Icon({ name, size = 21 }: { readonly name: IconName; readonly size?: number }): ReactNode {
  const paths: Record<IconName, ReactNode> = {
    library: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H20v16H5.5A1.5 1.5 0 0 1 4 18.5z" /><path d="M4 8h16M8 4v16" /></>,
    playlist: <><path d="M4 6h11M4 11h11M4 16h7" /><path d="M19 12v8l-3-1.7V14z" /></>,
    queue: <><path d="M4 6h12M4 11h12M4 16h7" /><path d="M19 16v4m-2-2h4" /></>,
    settings: <><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" /><path d="m19.4 15 .1.1 1.2.9-1.2 2.1-1.4-.5-.2.1-1.2.7-.2 1.5h-2.5l-.3-1.5-1.3-.7-.2-.1-1.4.5-1.2-2.1 1.2-.9.1-.2v-1.5l-.1-.2-1.2-.9 1.2-2.1 1.4.5.2-.1 1.3-.7.3-1.5h2.5l.2 1.5 1.2.7.2.1 1.4-.5 1.2 2.1-1.2.9-.1.2z" transform="translate(-1 -1) scale(1.08)" /></>,
    play: <path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none" />,
    pause: <><path d="M8 5h3v14H8zM15 5h3v14h-3z" fill="currentColor" stroke="none" /></>,
    next: <><path d="m5 5 10 7-10 7z" fill="currentColor" stroke="none" /><path d="M19 5v14" /></>,
    previous: <><path d="m19 5-10 7 10 7z" fill="currentColor" stroke="none" /><path d="M5 5v14" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4 4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    shuffle: <><path d="m16 3 4 4-4 4M4 17l4-4a5 5 0 0 1 7 0l5 5M4 7l1.4 1.4" /><path d="M16 17h4v4" /></>,
    repeat: <><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    back: <><path d="m15 18-6-6 6-6" /><path d="M9 12h12" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M5 17v4h14v-4" /></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M5 17v4h14v-4" /></>,
    sort: <><path d="M4 7h15M4 12h10M4 17h5" /><path d="m17 15 2 2 2-2" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Artwork({ track, file, large = false }: { readonly track?: TrackMetadata; readonly file: File | undefined; readonly large?: boolean }): ReactNode {
  const artworkRef = useRef<HTMLDivElement>(null);
  const [coverUrl, setCoverUrl] = useState<string>();
  const seed = track?.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) ?? 3;
  const hue = seed % 360;
  useEffect(() => {
    if (!file) {
      setCoverUrl(undefined);
      return;
    }
    const element = artworkRef.current;
    let disposed = false;
    let objectUrl: string | undefined;
    let started = false;
    const loadArtwork = (): void => {
      if (started) return;
      started = true;
      void extractEmbeddedArtwork(file).then((artwork) => {
        if (!artwork || disposed) return;
        objectUrl = URL.createObjectURL(artwork);
        setCoverUrl(objectUrl);
      }).catch(() => {
        if (!disposed) setCoverUrl(undefined);
      });
    };
    if (!element || !("IntersectionObserver" in window)) {
      loadArtwork();
    } else {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          loadArtwork();
        }
      }, { rootMargin: "120px" });
      observer.observe(element);
      return () => {
        disposed = true;
        observer.disconnect();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);
  return (
    <div ref={artworkRef} className={`artwork${large ? " artwork-large" : ""}${coverUrl ? " artwork-has-cover" : ""}`} style={{ background: `linear-gradient(145deg, hsl(${hue} 72% 38%), hsl(${(hue + 54) % 360} 66% 16%))` }}>
      {coverUrl && <img className="artwork-cover" src={coverUrl} alt="" />}
      <span className="artwork-shine" aria-hidden="true" />
      {!coverUrl && <Icon name="music" size={large ? 54 : 23} />}
      {large && <span className="artwork-label">{track?.album ?? "Local collection"}</span>}
    </div>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  active = false,
  className = "",
  disabled = false,
}: {
  readonly label: string;
  readonly icon: IconName;
  readonly onClick: () => void;
  readonly active?: boolean;
  readonly className?: string;
  readonly disabled?: boolean;
}): ReactNode {
  return <button type="button" className={`icon-button ${active ? "is-active" : ""} ${className}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}><Icon name={icon} /></button>;
}

function formatTime(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "0:00";
  const totalSeconds = Math.floor(milliseconds / 1_000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function App(): ReactNode {
  const fileInput = useRef<HTMLInputElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const runtime = useRef<AppRuntime | null>(null);
  const [library, setLibrary] = useState<LibraryMetadata | null>(null);
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_PLAYER_SETTINGS);
  const [player, setPlayer] = useState<PlayerSnapshot>({ playback: { state: "idle", positionMs: 0 }, queue: { trackIds: [], currentIndex: null, repeatMode: "off", shuffleEnabled: false } });
  const [integrity, setIntegrity] = useState<readonly TrackIntegrity[]>([]);
  const [destination, setDestinationState] = useState<Destination>(destinationFromHash);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<"ascending" | "descending">("ascending");
  const [listLimit, setListLimit] = useState(100);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [renamePlaylistValue, setRenamePlaylistValue] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [playlistAddTrackId, setPlaylistAddTrackId] = useState("");
  const [storageMessage, setStorageMessage] = useState("Checking browser storage support…");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingRelinks, setPendingRelinks] = useState<readonly PendingRelink[]>([]);
  const [unmatchedFiles, setUnmatchedFiles] = useState<readonly import("@offline-music-player/platform-contracts").SelectedAudioFile[]>([]);
  const [recoverySummary, setRecoverySummary] = useState("");
  const sortOptions: readonly { readonly value: SortField; readonly label: string }[] = [
    { value: "title", label: "Title" },
    { value: "artist", label: "Artist" },
    { value: "album", label: "Album" },
    { value: "addedAt", label: "Date added" },
  ];
  const setDestination = (next: Destination): void => {
    setDestinationState(next);
    if (window.location.hash !== `#${next}`) window.history.pushState(null, "", `#${next}`);
    setListLimit(100);
  };

  useEffect(() => {
    const restoreDestination = (): void => setDestinationState(destinationFromHash());
    window.addEventListener("popstate", restoreDestination);
    window.addEventListener("hashchange", restoreDestination);
    return () => {
      window.removeEventListener("popstate", restoreDestination);
      window.removeEventListener("hashchange", restoreDestination);
    };
  }, []);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent): void => {
      if (!sortMenuRef.current?.contains(event.target as Node)) setSortMenuOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [sortMenuOpen]);

  useEffect(() => {
    const onBackupExport = (event: Event): void => {
      const result = (event as CustomEvent<{ readonly message: string }>).detail;
      setNotice(result.message);
    };
    window.addEventListener("offline-music-backup-export", onBackupExport);
    return () => window.removeEventListener("offline-music-backup-export", onBackupExport);
  }, []);

  useEffect(() => {
    const input = fileInput.current;
    if (!input) return;
    const files = new BrowserAudioFileSource(createInputFileChooser(input));
    const repository = new IndexedDbLibraryRepository();
    const libraryController = new LibraryController(repository, files);
    const audio = new HtmlAudioPlaybackEngine(files);
    const playback = new PlaybackController(audio, (trackId) => libraryController.getFile(trackId));
    runtime.current = { files, repository, library: libraryController, audio, playback };
    const playbackSubscription = playback.subscribe(setPlayer);
    let mounted = true;
    const mediaSession = navigator.mediaSession;
    const registeredMediaActions: MediaSessionAction[] = [];
    if (mediaSession) {
      const invoke = (operation: Promise<void>): void => {
        void operation.catch((error: unknown) => setNotice(errorMessage(error)));
      };
      const actions: readonly [MediaSessionAction, MediaSessionActionHandler][] = [
        ["play", () => invoke(playback.togglePlayback())],
        ["pause", () => invoke(playback.pause())],
        ["nexttrack", () => invoke(playback.next())],
        ["previoustrack", () => invoke(playback.previous())],
        ["seekto", (details) => {
          if (details.seekTime !== undefined) invoke(playback.seek(details.seekTime * 1_000));
        }],
      ];
      const unavailable: string[] = [];
      for (const [action, handler] of actions) {
        try {
          mediaSession.setActionHandler(action, handler);
          registeredMediaActions.push(action);
        } catch (error) {
          if (error instanceof DOMException && error.name === "NotSupportedError") {
            unavailable.push(action);
          } else {
            setNotice(`A browser media control could not be enabled: ${errorMessage(error)}`);
          }
        }
      }
      if (unavailable.length > 0) {
        setNotice(`Some lock-screen controls are not available in this browser: ${unavailable.join(", ")}.`);
      }
    }

    void Promise.all([
      libraryController.load(),
      repository.loadSettings(),
      getBrowserStoragePersistenceStatus(navigator.storage),
    ]).then(async ([loadedLibrary, loadedSettings, storage]) => {
      if (!mounted) return;
      setLibrary(loadedLibrary);
      setSettings(loadedSettings);
      setSortField(loadedSettings.librarySort.field);
      setSortDirection(loadedSettings.librarySort.direction);
      playback.setRepeatMode(loadedSettings.repeatMode);
      playback.setShuffleEnabled(loadedSettings.shuffleEnabled);
      setIntegrity(await libraryController.checkIntegrity());
      setStorageMessage(storage.status === "supported"
        ? storage.granted ? "Persistent storage is granted. Browser storage can still be deleted."
          : "Persistent storage is not granted. Your browser may remove app data."
        : storage.status === "unsupported" ? "Persistent storage requests are not available in this browser."
          : "Persistent storage status could not be confirmed.");
      setLoading(false);
    }).catch((error: unknown) => {
      if (!mounted) return;
      setNotice(`The library could not be opened: ${errorMessage(error)}`);
      setLoading(false);
    });

    const androidPackagedAssets = window.location.hostname === "appassets.androidplatform.net";
    if ("serviceWorker" in navigator && window.isSecureContext && !androidPackagedAssets) {
      if (import.meta.env.DEV) {
        void (async () => {
          const workerUrl = new URL("./sw.js", document.baseURI).href;
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations
            .filter((registration) => [registration.active, registration.installing, registration.waiting]
              .some((worker) => worker?.scriptURL === workerUrl))
            .map((registration) => registration.unregister()));
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames
            .filter((name) => name.startsWith("offline-music-shell-"))
            .map((name) => caches.delete(name)));
        })().catch((error: unknown) => {
          if (mounted) setNotice(`Development cache cleanup failed: ${errorMessage(error)}`);
        });
      } else {
        void navigator.serviceWorker.register("./sw.js").catch((error: unknown) => {
          if (mounted) setNotice(`Offline app setup failed: ${errorMessage(error)}`);
        });
      }
    }
    return () => {
      mounted = false;
      playbackSubscription.unsubscribe();
      playback.dispose();
      audio.dispose();
      if (mediaSession) {
        for (const action of registeredMediaActions) mediaSession.setActionHandler(action, null);
      }
      void repository.close().catch((error: unknown) => console.error("Could not close library database.", error));
      runtime.current = null;
    };
  }, []);

  const currentTrack = useMemo(() => {
    const id = player.playback.currentTrackId;
    return library?.tracks.find((track) => track.id === id);
  }, [library, player.playback.currentTrackId]);

  useEffect(() => {
    const mediaSession = navigator.mediaSession;
    if (!mediaSession) return;
    mediaSession.playbackState = player.playback.state === "playing" ? "playing"
      : player.playback.state === "paused" ? "paused" : "none";
    mediaSession.metadata = currentTrack ? new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist ?? "Unknown artist",
      album: currentTrack.album ?? "Offline Music",
    }) : null;
    const durationMs = player.playback.durationMs ?? currentTrack?.durationMs;
    if (durationMs !== undefined && durationMs > 0 && "setPositionState" in mediaSession) {
      mediaSession.setPositionState({
        duration: durationMs / 1_000,
        position: Math.min(player.playback.positionMs, durationMs) / 1_000,
      });
    }
  }, [currentTrack, player.playback.durationMs, player.playback.positionMs, player.playback.state]);
  const visibleTracks = useMemo(() => {
    if (!library) return [];
    return sortTracks(searchTracks(library.tracks, search), { field: sortField, direction: sortDirection });
  }, [library, search, sortDirection, sortField]);
  const currentPlaylist = library?.playlists.find((playlist) => playlist.id === selectedPlaylistId);
  const unavailableCount = integrity.filter((item) => item.status !== "available").length;

  const tell = (message: string): void => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => current === message ? "" : current), 5_000);
  };

  const refreshLibrary = async (): Promise<void> => {
    const app = runtime.current;
    if (!app) return;
    const updated = app.library.getLibrary();
    setLibrary(updated);
    setIntegrity(await app.library.checkIntegrity());
  };

  const run = (operation: () => Promise<void>): void => {
    void operation().catch((error: unknown) => tell(errorMessage(error)));
  };

  const playTrack = (trackId: string, queueTrackIds?: readonly string[]): void => run(async () => {
    const app = runtime.current;
    if (!app || !library) return;
    const ids = queueTrackIds ?? visibleTracks.map((track) => track.id);
    const index = ids.indexOf(trackId);
    await app.playback.playQueue(index < 0 ? [trackId] : ids, Math.max(0, index));
    if (settings.shuffleEnabled) app.playback.setShuffleEnabled(true);
  });

  const addFiles = (): void => run(async () => {
    const app = runtime.current;
    if (!app) return;
    const result = await app.library.selectAndAddFiles();
    if (result.status === "selected") {
      await refreshLibrary();
      tell(`${result.files.length} file${result.files.length === 1 ? "" : "s"} added to your library.`);
    } else if (result.status === "failed") {
      tell(result.error.message);
    }
  });

  const chooseFiles = (): void => addFiles();

  const recoverFiles = (): void => run(async () => {
    const app = runtime.current;
    if (!app) return;
    const result = await app.files.selectAudioFiles();
    if (result.status === "cancelled") return;
    if (result.status === "failed") {
      tell(result.error.message);
      return;
    }
    const linked = await app.library.relinkFiles(result.files);
    const ambiguousFiles = linked.ambiguous.flatMap((entry) => {
      const file = result.files.find((item) => item.reference.token === entry.fileReferenceToken);
      return file ? [{ fileName: entry.fileName, candidateTrackIds: entry.candidateTrackIds, file }] : [];
    });
    const unmatchedTokens = new Set(linked.unlinkedFiles.map((entry) => entry.fileReferenceToken));
    const unmatched = result.files.filter((file) => unmatchedTokens.has(file.reference.token));
    setPendingRelinks(ambiguousFiles);
    setUnmatchedFiles(unmatched);
    setRecoverySummary(`${linked.linkedTrackIds.length} file${linked.linkedTrackIds.length === 1 ? "" : "s"} relinked. ${ambiguousFiles.length} ambiguous match${ambiguousFiles.length === 1 ? "" : "es"} need your choice. ${unmatched.length} new file${unmatched.length === 1 ? "" : "s"} do not match saved tracks.`);
    await refreshLibrary();
  });

  const saveSettings = (next: PlayerSettings): void => run(async () => {
    const app = runtime.current;
    if (!app) return;
    await app.repository.saveSettings(next);
    setSettings(next);
    app.playback.setRepeatMode(next.repeatMode);
    app.playback.setShuffleEnabled(next.shuffleEnabled);
    tell("Player settings saved.");
  });

  const toggleShuffle = (): void => {
    const next = { ...settings, shuffleEnabled: !settings.shuffleEnabled };
    saveSettings(next);
  };

  const cycleRepeat = (): void => {
    const repeatMode = settings.repeatMode === "off" ? "queue" : settings.repeatMode === "queue" ? "track" : "off";
    saveSettings({ ...settings, repeatMode });
  };

  const updateSort = (field: SortField): void => {
    setSortField(field);
    saveSettings({ ...settings, librarySort: { field, direction: sortDirection } });
  };

  const toggleSortDirection = (): void => {
    const direction = sortDirection === "ascending" ? "descending" : "ascending";
    setSortDirection(direction);
    saveSettings({ ...settings, librarySort: { field: sortField, direction } });
  };

  const createPlaylist = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    run(async () => {
      const app = runtime.current;
      if (!app || !newPlaylistName.trim()) return;
      const playlist = await app.library.createNewPlaylist(newPlaylistName);
      setNewPlaylistName("");
      setSelectedPlaylistId(playlist.id);
      await refreshLibrary();
      tell("Playlist created.");
    });
  };

  const exportBackup = (): void => run(async () => {
    if (!library) return;
    const backup = await new JsonMetadataBackupService().exportMetadata(library);
    if (window.OfflineMusicAndroid) {
      window.OfflineMusicAndroid.saveMetadataBackup(await backup.text());
      tell("Choose where to save the metadata backup.");
      return;
    }
    const url = URL.createObjectURL(backup);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "offline-music-backup.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    tell("Metadata backup exported. Audio files and file permissions are not included.");
  });

  const importBackup = (): void => run(async () => {
    const input = backupInput.current;
    const file = input?.files?.[0];
    const app = runtime.current;
    if (!file || !app) {
      if (input) input.value = "";
      return;
    }
    try {
      const service = new JsonMetadataBackupService();
      const result = await restoreMetadataBackup(file, service, app.repository);
      if (result.status === "invalid") {
        tell(`Backup rejected: ${result.errors.join(" ")}`);
        return;
      }
      await app.library.load();
      await refreshLibrary();
      setSelectedPlaylistId(null);
      setPendingRelinks([]);
      setUnmatchedFiles([]);
      tell("Library metadata restored. Reselect audio files to regain access.");
    } finally {
      input.value = "";
    }
  });

  const requestPersistence = (): void => run(async () => {
    const status = await requestBrowserStoragePersistence(navigator.storage);
    setStorageMessage(status.status === "supported"
      ? status.granted ? "Persistent storage is granted. Browser storage can still be deleted."
        : "Persistent storage was not granted. Export a backup to protect your metadata."
      : status.status === "unsupported" ? "Persistent storage requests are not available in this browser."
        : "The persistent storage request failed. Your music files were not changed.");
  });

  const navItems: { readonly id: Exclude<Destination, "player">; readonly label: string; readonly icon: IconName }[] = [
    { id: "library", label: "Library", icon: "library" },
    { id: "playlists", label: "Playlists", icon: "playlist" },
    { id: "queue", label: "Queue", icon: "queue" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  const getAudioFile = (trackId: string): File | undefined => {
    const app = runtime.current;
    if (!app) return undefined;
    const selected = app.library.getFile(trackId);
    return selected ? app.files.getFile(selected.reference) : undefined;
  };

  const trackRows = (tracks: readonly TrackMetadata[], options: { readonly queueControls?: boolean; readonly queueIndices?: readonly number[]; readonly playlistId?: string } = {}): ReactNode => (
    <>
    <ul className="track-list">
      {tracks.slice(0, listLimit).map((track, rowIndex) => {
        const queueIndex = options.queueControls
          ? options.queueIndices?.[rowIndex] ?? player.queue.trackIds.indexOf(track.id)
          : player.queue.trackIds.indexOf(track.id);
        return (
          <li className={`track-row${player.playback.currentTrackId === track.id ? " track-row-current" : ""}`} key={`${track.id}-${rowIndex}`}>
            <Artwork track={track} file={getAudioFile(track.id)} />
            <button type="button" className="track-copy" onClick={() => {
              if (options.queueControls) run(() => runtime.current?.playback.playQueueItem(queueIndex) ?? Promise.resolve());
              else playTrack(track.id, options.playlistId ? selectedPlaylist?.trackIds : undefined);
            }} aria-label={`Play ${track.title}${track.artist ? ` by ${track.artist}` : ""}`}>
              <span className="track-title">{track.title}</span>
              <span className="track-subtitle">{[track.artist, track.album].filter(Boolean).join(" · ") || track.fileName}</span>
            </button>
            {options.queueControls ? (
              <div className="row-actions">
                <IconButton label={`Move ${track.title} up`} icon="back" disabled={queueIndex <= 0} onClick={() => run(() => runtime.current?.playback.moveQueueItem(queueIndex, queueIndex - 1) ?? Promise.resolve())} />
                <IconButton label={`Move ${track.title} down`} icon="back" className="rotate-icon" disabled={queueIndex < 0 || queueIndex >= player.queue.trackIds.length - 1} onClick={() => run(() => runtime.current?.playback.moveQueueItem(queueIndex, queueIndex + 1) ?? Promise.resolve())} />
                <IconButton label={`Remove ${track.title} from queue`} icon="close" onClick={() => queueIndex >= 0 && run(() => runtime.current?.playback.removeQueueItem(queueIndex) ?? Promise.resolve())} />
              </div>
            ) : options.playlistId ? (
              <div className="row-actions">
                <IconButton label={`Move ${track.title} up in playlist`} icon="back" disabled={(selectedPlaylist?.trackIds.indexOf(track.id) ?? 0) <= 0} onClick={() => run(async () => {
                  const app = runtime.current;
                  if (!app || !options.playlistId) return;
                  const index = selectedPlaylist?.trackIds.indexOf(track.id) ?? -1;
                  if (index > 0) await app.library.reorderPlaylistTrack(options.playlistId, index, index - 1);
                  await refreshLibrary();
                })} />
                <IconButton label={`Move ${track.title} down in playlist`} icon="back" className="rotate-icon" disabled={(selectedPlaylist?.trackIds.indexOf(track.id) ?? -1) >= (selectedPlaylist?.trackIds.length ?? 0) - 1} onClick={() => run(async () => {
                  const app = runtime.current;
                  if (!app || !options.playlistId) return;
                  const index = selectedPlaylist?.trackIds.indexOf(track.id) ?? -1;
                  if (index >= 0) await app.library.reorderPlaylistTrack(options.playlistId, index, index + 1);
                  await refreshLibrary();
                })} />
                <IconButton label={`Remove ${track.title} from playlist`} icon="close" onClick={() => run(async () => {
                  const app = runtime.current;
                  if (!app || !options.playlistId) return;
                  await app.library.removeTrackFromExistingPlaylist(options.playlistId, track.id);
                  await refreshLibrary();
                })} />
              </div>
            ) : (
              <div className="row-actions">
                <IconButton label={`Add ${track.title} to queue`} icon="plus" onClick={() => runtime.current?.playback.enqueue([track.id])} />
                <IconButton label={`Remove ${track.title} from library`} icon="close" onClick={() => {
                  if (!window.confirm(`Remove “${track.title}” from your library? This does not delete the audio file.`)) return;
                  run(async () => {
                    const app = runtime.current;
                    if (!app) return;
                    await app.library.removeTrack(track.id);
                    await refreshLibrary();
                    tell("Track removed from the library. The original audio file was not deleted.");
                  });
                }} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
    {tracks.length > listLimit && <button type="button" className="button button-secondary show-more" onClick={() => setListLimit((limit) => limit + 100)}>Show 100 more tracks</button>}
    </>
  );

  const selectedPlaylist: Playlist | undefined = currentPlaylist;
  const playlistTracks = selectedPlaylist && runtime.current
    ? runtime.current.library.getPlaylistTracks(selectedPlaylist.id)
    : [];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="side-rail" aria-label="Main navigation">
        <a className="brand" href="#library" onClick={(event) => { event.preventDefault(); setDestination("library"); }}>
          <span className="brand-mark"><Icon name="music" size={24} /></span>
          <span>Offline Music</span>
        </a>
        <nav className="side-nav">
          {navItems.map((item) => (
            <button key={item.id} type="button" className={`nav-link${destination === item.id ? " selected" : ""}`} onClick={() => setDestination(item.id)}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <p className="privacy-note">Your music stays on this device.</p>
      </aside>

      <main id="main-content" className="main-content" tabIndex={-1}>
        <header className="topbar">
          <div className="topbar-heading">
            {destination === "player" && <IconButton label="Back to library" icon="back" onClick={() => setDestination("library")} />}
            <h1>{destination === "player" ? "Now Playing" : destination === "library" ? "Library" : destination === "playlists" ? "Playlists" : destination === "queue" ? "Queue" : "Settings"}</h1>
          </div>
          <div className="topbar-actions">
            {destination === "library" && <button type="button" className="button button-secondary" onClick={chooseFiles}><Icon name="plus" /> <span>Add music</span></button>}
            {destination === "library" && <IconButton label="Open queue" icon="queue" onClick={() => setDestination("queue")} />}
          </div>
        </header>

        {notice && <div className="toast" role="status"><span>{notice}</span><IconButton label="Dismiss message" icon="close" onClick={() => setNotice("")} /></div>}
        {loading ? (
          <section className="loading-state" aria-live="polite"><span className="loading-orb" /><p>Opening your local library…</p></section>
        ) : !library ? (
          <section className="error-state"><h2>Your library could not be opened</h2><p>{notice || "Reload the app to try again."}</p></section>
        ) : (
          <>
            {destination === "library" && (
              <section className="view-section" aria-labelledby="library-heading">
                <div className="collection-heading">
                  <div><p className="section-kicker">YOUR DEVICE, YOUR MUSIC</p><h2 id="library-heading">Listen offline.</h2><p className="collection-count">{library.tracks.length} {library.tracks.length === 1 ? "track" : "tracks"} in your collection</p></div>
                  {visibleTracks.length > 0 && <button type="button" className="button button-primary" onClick={() => playTrack(visibleTracks[0]!.id)}><Icon name="play" /> {search ? "Play results" : "Play collection"}</button>}
                </div>
                {unavailableCount > 0 && (
                  <div className="recovery-banner" role="status">
                    <span className="recovery-icon"><Icon name="music" /></span>
                    <div><strong>{unavailableCount} file{unavailableCount === 1 ? "" : "s"} need access again</strong><p>Music files stay in their original location. Reselect them to restore playback.</p></div>
                    <button type="button" className="button button-secondary" onClick={recoverFiles}>Reselect files</button>
                  </div>
                )}
                {recoverySummary && (
                  <div className="recovery-details">
                    <div className="recovery-summary"><p>{recoverySummary}</p><IconButton label="Dismiss recovery details" icon="close" onClick={() => { setRecoverySummary(""); setPendingRelinks([]); setUnmatchedFiles([]); }} /></div>
                    {pendingRelinks.map((pending) => (
                      <label className="relink-row" key={`${pending.fileName}-${pending.file.track.id}`}>
                        <span>Choose which saved “{pending.fileName}” this file belongs to</span>
                        <select defaultValue="" onChange={(event) => {
                          const trackId = event.currentTarget.value;
                          if (!trackId) return;
                          runtime.current?.library.linkTrackToFile(trackId, pending.file);
                          setPendingRelinks((items) => items.filter((item) => item.file.track.id !== pending.file.track.id));
                          void refreshLibrary();
                        }}>
                          <option value="" disabled>Select a saved track</option>
                          {pending.candidateTrackIds.map((id) => <option key={id} value={id}>{library.tracks.find((track) => track.id === id)?.title ?? id}</option>)}
                        </select>
                      </label>
                    ))}
                    {unmatchedFiles.length > 0 && <button type="button" className="button button-secondary" onClick={() => run(async () => {
                      const app = runtime.current;
                      if (!app) return;
                      await app.library.addSelectedFiles(unmatchedFiles);
                      setUnmatchedFiles([]);
                      await refreshLibrary();
                      tell("Unmatched files were added as new tracks.");
                    })}>Add unmatched files as new tracks</button>}
                  </div>
                )}
                <div className="library-tools">
                  <label className="search-field"><Icon name="search" /><span className="visually-hidden">Search your library</span><input name="library-search" autoComplete="off" value={search} onChange={(event) => { setSearch(event.currentTarget.value); setListLimit(100); }} placeholder="Search tracks, artists, albums…" /></label>
                  <div className="sort-controls">
                    <label className="visually-hidden" htmlFor="sort-field">Sort library</label>
                    <div className="sort-field-picker" ref={sortMenuRef} onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setSortMenuOpen(false);
                        sortButtonRef.current?.focus();
                      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                        const options = Array.from(sortMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
                        if (!options.length) return;
                        event.preventDefault();
                        const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement);
                        const nextIndex = event.key === "ArrowDown"
                          ? (currentIndex + 1 + options.length) % options.length
                          : (currentIndex - 1 + options.length) % options.length;
                        options[nextIndex]?.focus();
                      }
                    }}>
                      <button
                        ref={sortButtonRef}
                        id="sort-field"
                        type="button"
                        className="sort-field-trigger"
                        aria-haspopup="listbox"
                        aria-expanded={sortMenuOpen}
                        aria-controls="sort-field-options"
                        onClick={() => setSortMenuOpen((open) => !open)}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSortMenuOpen(true);
                            window.setTimeout(() => sortMenuRef.current?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"]')?.focus(), 0);
                          }
                        }}
                      >
                        <span>{sortOptions.find((option) => option.value === sortField)?.label ?? "Title"}</span>
                        <svg aria-hidden="true" viewBox="0 0 20 20" width="17" height="17"><path d="m5 7.5 5 5 5-5" /></svg>
                      </button>
                      {sortMenuOpen && (
                        <div id="sort-field-options" className="sort-field-menu" role="listbox" aria-label="Sort library">
                          {sortOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              role="option"
                              aria-selected={sortField === option.value}
                              className="sort-field-option"
                              onClick={() => {
                                updateSort(option.value);
                                setSortMenuOpen(false);
                                sortButtonRef.current?.focus();
                              }}
                            >{option.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <IconButton label={`Sort ${sortDirection === "ascending" ? "descending" : "ascending"}`} icon="sort" onClick={toggleSortDirection} />
                  </div>
                </div>
                {visibleTracks.length > 0 ? trackRows(visibleTracks) : (
                  <div className="empty-state">
                    <div className="empty-art"><Icon name={search ? "search" : "music"} size={34} /></div>
                    <h3>{search ? "No matches found" : "Your music belongs here"}</h3>
                    <p>{search ? "Try a different title, artist, or album." : "Choose audio files from your device. They stay where you keep them."}</p>
                    {search ? <button type="button" className="button button-secondary" onClick={() => setSearch("")}>Clear search</button> : <button type="button" className="button button-primary" onClick={chooseFiles}><Icon name="plus" /> Choose music</button>}
                  </div>
                )}
              </section>
            )}

            {destination === "player" && (
              <section className="player-view" aria-label="Now Playing">
                {currentTrack ? (
                  <>
                    <Artwork track={currentTrack} file={getAudioFile(currentTrack.id)} large />
                    <div className="player-track"><h2>{currentTrack.title}</h2><p>{currentTrack.artist ?? "Unknown artist"}{currentTrack.album ? ` · ${currentTrack.album}` : ""}</p></div>
                    {player.playback.failure && <div className="player-error" role="alert"><strong>Playback needs attention</strong><p>{player.playback.failure.message}</p><button type="button" className="button button-secondary" onClick={recoverFiles}>Reselect audio</button></div>}
                    <div className="progress-control">
                      <input aria-label="Playback position" type="range" min="0" max={player.playback.durationMs ?? currentTrack.durationMs ?? 0} value={Math.min(player.playback.positionMs, player.playback.durationMs ?? currentTrack.durationMs ?? 0)} disabled={!player.playback.durationMs && !currentTrack.durationMs} onChange={(event) => run(() => runtime.current?.playback.seek(Number(event.currentTarget.value)) ?? Promise.resolve())} />
                      <div><span>{formatTime(player.playback.positionMs)}</span><span>{formatTime(player.playback.durationMs ?? currentTrack.durationMs ?? 0)}</span></div>
                    </div>
                    <div className="player-controls">
                      <IconButton label="Toggle shuffle" icon="shuffle" active={settings.shuffleEnabled} onClick={toggleShuffle} />
                      <IconButton label="Previous track" icon="previous" className="control-secondary" onClick={() => run(() => runtime.current?.playback.previous() ?? Promise.resolve())} />
                      <IconButton label={player.playback.state === "playing" ? "Pause" : "Play"} icon={player.playback.state === "playing" ? "pause" : "play"} className="control-main" onClick={() => run(() => runtime.current?.playback.togglePlayback() ?? Promise.resolve())} />
                      <IconButton label="Next track" icon="next" className="control-secondary" onClick={() => run(() => runtime.current?.playback.next() ?? Promise.resolve())} />
                      <IconButton label={`Repeat ${settings.repeatMode}`} icon="repeat" active={settings.repeatMode !== "off"} onClick={cycleRepeat} />
                    </div>
                    <div className="player-extra"><button type="button" className="text-button" onClick={() => setDestination("queue")}><Icon name="queue" /> Up next</button><span>{player.playback.state === "loading" ? "Loading audio…" : player.playback.state === "playing" ? "Playing from this device" : player.playback.state === "error" ? "Audio unavailable" : "Ready when you are"}</span></div>
                  </>
                ) : <div className="empty-state"><div className="empty-art"><Icon name="music" size={34} /></div><h3>Nothing is playing</h3><p>Choose a track from your library to begin.</p><button type="button" className="button button-primary" onClick={() => setDestination("library")}>Browse library</button></div>}
              </section>
            )}

            {destination === "queue" && (
              <section className="view-section">
                <div className="section-heading"><div><p className="section-kicker">UP NEXT</p><h2>Queue</h2><p className="collection-count">{player.queue.trackIds.length} queued tracks</p></div><button type="button" className="button button-secondary" onClick={() => { const tracksToAdd = sortTracks(library.tracks, { field: sortField, direction: sortDirection }); runtime.current?.playback.enqueue(tracksToAdd.map((track) => track.id)); tell(`${tracksToAdd.length} track${tracksToAdd.length === 1 ? "" : "s"} added to the queue.`); }} disabled={library.tracks.length === 0}><Icon name="plus" /> Add library</button></div>
                {player.queue.trackIds.length ? trackRows(player.queue.trackIds.flatMap((id) => {
                  const track = library.tracks.find((item) => item.id === id);
                  return track ? [track] : [];
                }), { queueControls: true, queueIndices: player.queue.trackIds.flatMap((id, index) => library.tracks.some((track) => track.id === id) ? [index] : []) }) : <div className="empty-state compact-empty"><div className="empty-art"><Icon name="queue" size={30} /></div><h3>Your queue is clear</h3><p>Add tracks from your library or start a collection.</p><button type="button" className="button button-primary" onClick={() => setDestination("library")}>Browse library</button></div>}
              </section>
            )}

            {destination === "playlists" && (
              <section className="view-section">
                {selectedPlaylist ? (
                  <>
                    <div className="section-heading"><div className="playlist-title-wrap"><IconButton label="Back to playlists" icon="back" onClick={() => setSelectedPlaylistId(null)} /><div><p className="section-kicker">PLAYLIST</p><h2>{selectedPlaylist.name}</h2><p className="collection-count">{playlistTracks.length} tracks</p></div></div>                    <button type="button" className="button button-danger" onClick={() => {
                      if (!window.confirm(`Delete the playlist “${selectedPlaylist.name}”? This does not delete audio files.`)) return;
                      run(async () => {
                    const app = runtime.current;
                    if (!app) return;
                    await app.library.deleteExistingPlaylist(selectedPlaylist.id);
                    setSelectedPlaylistId(null);
                    await refreshLibrary();
                    }); }}>Delete playlist</button></div>
                    <form className="playlist-rename-form" onSubmit={(event) => {
                      event.preventDefault();
                      run(async () => {
                        const app = runtime.current;
                        if (!app || !renamePlaylistValue.trim()) return;
                        await app.library.renameExistingPlaylist(selectedPlaylist.id, renamePlaylistValue);
                        setRenamePlaylistValue("");
                        await refreshLibrary();
                        tell("Playlist renamed.");
                      });
                    }}>
                      <label className="visually-hidden" htmlFor="rename-playlist">Rename playlist</label>
                      <input id="rename-playlist" name="rename-playlist" autoComplete="off" value={renamePlaylistValue} onChange={(event) => setRenamePlaylistValue(event.currentTarget.value)} placeholder="Rename playlist…" maxLength={80} />
                      <button type="submit" className="button button-secondary" disabled={!renamePlaylistValue.trim()}>Save name</button>
                    </form>
                    <form className="playlist-add-form" onSubmit={(event) => {
                      event.preventDefault();
                      run(async () => {
                        const app = runtime.current;
                        if (!app || !playlistAddTrackId) return;
                        await app.library.addTracksToExistingPlaylist(selectedPlaylist.id, [playlistAddTrackId]);
                        setPlaylistAddTrackId("");
                        await refreshLibrary();
                      });
                    }}>
                      <label className="visually-hidden" htmlFor="playlist-track">Choose a track</label>
                      <select id="playlist-track" value={playlistAddTrackId} onChange={(event) => setPlaylistAddTrackId(event.currentTarget.value)}>
                        <option value="">Add a track…</option>
                        {library.tracks.filter((track) => !selectedPlaylist.trackIds.includes(track.id)).map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}
                      </select>
                      <button type="submit" className="button button-secondary" disabled={!playlistAddTrackId}><Icon name="plus" /> Add track</button>
                    </form>
                    {playlistTracks.length ? trackRows(playlistTracks, { playlistId: selectedPlaylist.id }) : <div className="empty-state compact-empty"><h3>This playlist is empty</h3><p>Add tracks from your local library.</p></div>}
                  </>
                ) : (
                  <>
                    <div className="section-heading"><div><p className="section-kicker">MADE FOR YOUR LIBRARY</p><h2>Playlists</h2><p className="collection-count">Your music, arranged your way</p></div></div>
                    <form className="playlist-create-form" onSubmit={createPlaylist}>
                      <label className="visually-hidden" htmlFor="new-playlist-name">New playlist name</label>
                      <input id="new-playlist-name" name="playlist-name" autoComplete="off" value={newPlaylistName} onChange={(event) => setNewPlaylistName(event.currentTarget.value)} placeholder="Name a new playlist…" maxLength={80} />
                      <button type="submit" className="button button-primary" disabled={!newPlaylistName.trim()}><Icon name="plus" /> Create playlist</button>
                    </form>
                    {library.playlists.length ? (
                      <ul className="playlist-list">{library.playlists.map((playlist) => (
                        <li key={playlist.id}><button type="button" className="playlist-card" onClick={() => setSelectedPlaylistId(playlist.id)}><span className="playlist-art"><Icon name="playlist" /></span><span><strong>{playlist.name}</strong><small>{playlist.trackIds.length} {playlist.trackIds.length === 1 ? "track" : "tracks"}</small></span><Icon name="back" /></button></li>
                      ))}</ul>
                    ) : <div className="empty-state compact-empty"><div className="empty-art"><Icon name="playlist" size={30} /></div><h3>No playlists yet</h3><p>Create a playlist to bring favorite tracks together.</p></div>}
                  </>
                )}
              </section>
            )}

            {destination === "settings" && (
              <section className="view-section settings-view">
                <div className="section-heading"><div><p className="section-kicker">ON THIS DEVICE</p><h2>Settings</h2><p className="collection-count">Keep your library private and recoverable.</p></div></div>
                <div className="settings-group">
                  <h3>Playback</h3>
                  <div className="setting-row"><span><strong>Shuffle</strong><small>Change the order of upcoming tracks.</small></span><button type="button" role="switch" aria-label="Shuffle" aria-checked={settings.shuffleEnabled} className={`switch${settings.shuffleEnabled ? " switch-on" : ""}`} onClick={toggleShuffle}><span /></button></div>
                  <div className="setting-row"><span><strong>Repeat</strong><small>Current mode: {settings.repeatMode === "off" ? "Off" : settings.repeatMode === "queue" ? "Queue" : "Track"}.</small></span><button type="button" className="button button-secondary" onClick={cycleRepeat}>Change</button></div>
                </div>
                <div className="settings-group">
                  <h3>Library backup</h3>
                  <p className="setting-copy">Backups include track details and playlists. They never contain audio files or file-access permissions.</p>
                  <div className="setting-actions"><button type="button" className="button button-secondary" onClick={exportBackup}><Icon name="download" /> Export metadata</button><button type="button" className="button button-secondary" onClick={() => backupInput.current?.click()}><Icon name="upload" /> Import backup</button></div>
                </div>
                <div className="settings-group">
                  <h3>Browser storage</h3>
                  <p className="setting-copy">{storageMessage}</p>
                  <button type="button" className="button button-secondary" onClick={requestPersistence}>Request persistent storage</button>
                </div>
                <div className="settings-group">
                  <h3>About and privacy</h3>
                  <p className="setting-copy">Offline Music · Version {appVersion.trim()} development build</p>
                  <p className="setting-copy">Audio files are not uploaded or copied into browser storage. On iPhone, file access may need to be restored after closing the app. Background playback depends on browser and iOS behavior and has not been confirmed on your device.</p>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {currentTrack && destination !== "player" && (
        <div className="mini-player">
          <button type="button" className="mini-open" onClick={() => setDestination("player")} aria-label={`Open player: ${currentTrack.title}`}>
          <Artwork track={currentTrack} file={getAudioFile(currentTrack.id)} />
          <span className="mini-copy"><strong>{currentTrack.title}</strong><small>{currentTrack.artist ?? currentTrack.fileName}</small></span>
          </button>
          <IconButton label={player.playback.state === "playing" ? "Pause playback" : "Resume playback"} icon={player.playback.state === "playing" ? "pause" : "play"} className="mini-state" onClick={() => run(() => runtime.current?.playback.togglePlayback() ?? Promise.resolve())} />
        </div>
      )}
      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => <button key={item.id} type="button" className={`bottom-nav-item${destination === item.id ? " selected" : ""}`} aria-current={destination === item.id ? "page" : undefined} onClick={() => setDestination(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}
      </nav>
      <input ref={fileInput} className="hidden-input" type="file" name="audio-files" aria-label="Choose audio files" accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus" multiple />
        <input ref={backupInput} className="hidden-input" type="file" name="metadata-backup" aria-label="Choose metadata backup" accept="application/json,.json" onChange={importBackup} />
    </div>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("The app root element is missing.");
const reactRoot = createRoot(rootElement);
if (import.meta.hot) import.meta.hot.dispose(() => reactRoot.unmount());
reactRoot.render(<App />);
import appVersion from "../../../VERSION?raw";
