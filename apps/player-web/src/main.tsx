import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type TouchEvent as ReactTouchEvent } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
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
import { InstallLanding } from "./install-landing";
import { isInstalledPwa, isMobilePhone, shouldShowStartupSplash, STARTUP_SPLASH_DURATION_MS } from "./pwa-mode";
import { getPlayerGestureDestination } from "./player-gesture";
import { getCategoryTracks, getRandomCategoryQueue } from "./category-playback";
import { Icon, type IconName } from "./icon";
import "./styles.css";
import "./pwa-ui.css";

// Browser/PWA and Android WebView share the same UI. Platform-specific file
// access and persistence behavior remains behind the Android bridge.
document.documentElement.classList.add("pwa-ui-enabled");

const isAppleMobileDevice = /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
if (isAppleMobileDevice && isStandalone()) {
  document.documentElement.classList.add("ios-standalone-pwa");
}

type Destination = "home" | "library" | "search" | "playlists" | "queue" | "settings" | "player";
const destinations: readonly Destination[] = ["home", "library", "search", "playlists", "queue", "settings", "player"];
const figmaAsset = (name: string): string => `${import.meta.env.BASE_URL}figma/${name}`;
const musicCategories = [
  { name: "Playlist", tone: "playlists" },
  { name: "Chill", tone: "chill", term: "chill" },
  { name: "Focus", tone: "focus", term: "focus" },
  { name: "Electronic", tone: "electronic", term: "electronic" },
  { name: "Indie", tone: "indie", term: "indie" },
  { name: "Ambient", tone: "ambient", term: "ambient" },
] as const;

declare global {
  interface Window {
    OfflineMusicAndroid?: {
      saveMetadataBackup(backupJson: string): void;
      setTheme(lightMode: boolean): void;
    };
  }
}

function destinationFromHash(): Destination {
  const value = window.location.hash.slice(1);
  return destinations.includes(value as Destination) ? value as Destination : "home";
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

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: "accepted" | "dismissed"; readonly platform: string }>;
}

function isStandalone(): boolean {
  if (window.location.hostname === "appassets.androidplatform.net") return true;
  const displayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const navigatorStandalone = "standalone" in navigator && navigator.standalone === true;
  return isInstalledPwa(displayModeStandalone, navigatorStandalone);
}

function AppBootstrap(): ReactNode {
  const [installed, setInstalled] = useState(isStandalone);
  const [showStartupSplash, setShowStartupSplash] = useState(() => shouldShowStartupSplash(
    isStandalone() && window.location.hostname !== "appassets.androidplatform.net",
    isMobilePhone(navigator.userAgent),
  ));
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [serviceWorkerError, setServiceWorkerError] = useState("");

  useEffect(() => {
    if (!showStartupSplash) return;
    const timeout = window.setTimeout(() => setShowStartupSplash(false), STARTUP_SPLASH_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [showStartupSplash]);

  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const updateDisplayMode = (): void => setInstalled(isStandalone());
    const onBeforeInstallPrompt = (event: Event): void => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setInstallPrompt(promptEvent);
    };
    const onServiceWorkerError = (event: Event): void => {
      const detail = (event as CustomEvent<string>).detail;
      setServiceWorkerError(detail);
    };
    let reloadAfterWorkerUpdate: (() => void) | undefined;

    standaloneQuery.addEventListener("change", updateDisplayMode);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("offline-music-service-worker-error", onServiceWorkerError);

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
          const message = `Development cache cleanup failed: ${errorMessage(error)}`;
          console.error(message);
          window.dispatchEvent(new CustomEvent("offline-music-service-worker-error", { detail: message }));
        });
      } else {
        if (navigator.serviceWorker.controller) {
          reloadAfterWorkerUpdate = (): void => window.location.reload();
          navigator.serviceWorker.addEventListener("controllerchange", reloadAfterWorkerUpdate);
        }
        void navigator.serviceWorker.register("./sw.js").catch((error: unknown) => {
          const message = `Offline app setup failed: ${errorMessage(error)}`;
          console.error(message);
          window.dispatchEvent(new CustomEvent("offline-music-service-worker-error", { detail: message }));
        });
      }
    }

    return () => {
      standaloneQuery.removeEventListener("change", updateDisplayMode);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("offline-music-service-worker-error", onServiceWorkerError);
      if (reloadAfterWorkerUpdate) {
        navigator.serviceWorker.removeEventListener("controllerchange", reloadAfterWorkerUpdate);
      }
    };
  }, []);

  const appContent = installed || (import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "1")
    ? <App />
    : <InstallLanding
        installPromptAvailable={installPrompt !== null}
        onInstall={async () => {
          if (!installPrompt) return;
          try {
            await installPrompt.prompt();
            await installPrompt.userChoice;
            setInstallPrompt(null);
          } catch (error) {
            setServiceWorkerError(`The install prompt could not be opened: ${errorMessage(error)}`);
          }
        }}
        setupError={serviceWorkerError}
      />;

  return (
    <>
      {appContent}
      {showStartupSplash && installed && createPortal(
        <div className="startup-splash" role="status">
          <span className="startup-splash-mark"><Icon name="music" size={38} /></span>
          <span className="startup-splash-title">Offline Music</span>
        </div>,
        document.body,
      )}
    </>
  );
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

function isInteractivePlayerTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest("button, input, select, textarea, a, [contenteditable='true']") !== null;
}

export function App(): ReactNode {
  const androidPackagedAssets = window.location.hostname === "appassets.androidplatform.net";
  const pwaUiEnabled = document.documentElement.classList.contains("pwa-ui-enabled");
  const fileInput = useRef<HTMLInputElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const playerViewRef = useRef<HTMLElement>(null);
  const playerGestureStart = useRef<{ readonly source: "pointer" | "touch"; readonly id: number; readonly x: number; readonly y: number } | null>(null);
  const runtime = useRef<AppRuntime | null>(null);
  const [library, setLibrary] = useState<LibraryMetadata | null>(null);
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_PLAYER_SETTINGS);
  const [lightMode, setLightMode] = useState(() => {
    try { return window.localStorage.getItem("offline-music-theme") === "light"; } catch { return false; }
  });
  const persistencePrivacyMessage = androidPackagedAssets
    ? "Selected audio is copied into private storage inside this app and remains available after reopening. It is removed if you clear app data or uninstall the app. Audio is never uploaded."
    : "Selected audio is copied into this app's private browser storage so it remains available after reopening. It is never uploaded. iOS may still clear app data under storage pressure or when site data is removed; keep your original files and metadata backups.";
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
  const [playerDragOffset, setPlayerDragOffset] = useState(0);
  useEffect(() => {
    document.documentElement.dataset.theme = lightMode ? "light" : "dark";
    document.documentElement.style.colorScheme = lightMode ? "light" : "dark";
    try { window.localStorage.setItem("offline-music-theme", lightMode ? "light" : "dark"); } catch { /* Theme still applies for this session. */ }
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute("content", lightMode ? "#f3f6fb" : "#080d18");
    window.OfflineMusicAndroid?.setTheme(lightMode);
    const iosStatusBar = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]');
    // Keep the light iOS status bar opaque so the page background does not tint the clock area.
    iosStatusBar?.setAttribute("content", lightMode ? "default" : "black");
  }, [lightMode]);
  const persistentAudioEnabled = runtime.current?.files.getCapabilities().persistentFileReferences.status === "supported";
  const sortOptions: readonly { readonly value: SortField; readonly label: string }[] = [
    { value: "title", label: "Title" },
    { value: "artist", label: "Artist" },
    { value: "album", label: "Album" },
    { value: "addedAt", label: "Date added" },
  ];
  const setDestination = (next: Destination, replaceCurrentHistory = false): void => {
    setDestinationState(next);
    if (window.location.hash !== `#${next}`) {
      if (replaceCurrentHistory) window.history.replaceState(null, "", `#${next}`);
      else window.history.pushState(null, "", `#${next}`);
    }
    setListLimit(100);
  };
  const beginPlayerGesture = (source: "pointer" | "touch", id: number, x: number, y: number, target: EventTarget | null): void => {
    if (isInteractivePlayerTarget(target) || (playerViewRef.current?.scrollTop ?? 0) > 0) return;
    playerGestureStart.current = { source, id, x, y };
  };
  const updatePlayerGesture = (source: "pointer" | "touch", id: number, x: number, y: number): void => {
    const start = playerGestureStart.current;
    if (!start || start.source !== source || start.id !== id) return;
    const deltaX = x - start.x;
    const deltaY = y - start.y;
    if (deltaY > 8 && deltaY > Math.abs(deltaX) * 1.15) {
      setPlayerDragOffset(Math.min(deltaY, 150));
    } else if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
      playerGestureStart.current = null;
      setPlayerDragOffset(0);
    }
  };
  const finishPlayerGesture = (source: "pointer" | "touch", id: number, x: number, y: number): void => {
    const start = playerGestureStart.current;
    if (!start || start.source !== source || start.id !== id) return;
    playerGestureStart.current = null;
    setPlayerDragOffset(0);
    if ((playerViewRef.current?.scrollTop ?? 0) === 0
      && getPlayerGestureDestination(start, { x, y }) === "library") setDestination("library", true);
  };
  const cancelPlayerGesture = (source: "pointer" | "touch", id: number): void => {
    if (playerGestureStart.current?.source !== source || playerGestureStart.current.id !== id) return;
    playerGestureStart.current = null;
    setPlayerDragOffset(0);
  };
  const onPlayerPointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    if (event.pointerType === "touch" || (event.pointerType === "mouse" && event.button !== 0)) return;
    beginPlayerGesture("pointer", event.pointerId, event.clientX, event.clientY, event.target);
    if (playerGestureStart.current?.source === "pointer" && playerGestureStart.current.id === event.pointerId) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };
  const onPlayerPointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
    if (event.pointerType !== "touch") updatePlayerGesture("pointer", event.pointerId, event.clientX, event.clientY);
  };
  const onPlayerPointerUp = (event: ReactPointerEvent<HTMLElement>): void => {
    if (event.pointerType !== "touch") finishPlayerGesture("pointer", event.pointerId, event.clientX, event.clientY);
  };
  const onPlayerPointerCancel = (event: ReactPointerEvent<HTMLElement>): void => {
    if (event.pointerType !== "touch") cancelPlayerGesture("pointer", event.pointerId);
  };
  const onPlayerTouchStart = (event: ReactTouchEvent<HTMLElement>): void => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (touch) beginPlayerGesture("touch", touch.identifier, touch.clientX, touch.clientY, event.target);
  };
  const onPlayerTouchMove = (event: ReactTouchEvent<HTMLElement>): void => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (touch) updatePlayerGesture("touch", touch.identifier, touch.clientX, touch.clientY);
  };
  const onPlayerTouchEnd = (event: ReactTouchEvent<HTMLElement>): void => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    if (event.touches.length > 0) cancelPlayerGesture("touch", touch.identifier);
    else finishPlayerGesture("touch", touch.identifier, touch.clientX, touch.clientY);
  };
  const onPlayerTouchCancel = (event: ReactTouchEvent<HTMLElement>): void => {
    const touch = event.changedTouches[0];
    if (touch) cancelPlayerGesture("touch", touch.identifier);
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
    const onServiceWorkerError = (event: Event): void => {
      setNotice((event as CustomEvent<string>).detail);
    };
    window.addEventListener("offline-music-backup-export", onBackupExport);
    window.addEventListener("offline-music-service-worker-error", onServiceWorkerError);
    return () => {
      window.removeEventListener("offline-music-backup-export", onBackupExport);
      window.removeEventListener("offline-music-service-worker-error", onServiceWorkerError);
    };
  }, []);

  useEffect(() => {
    const input = fileInput.current;
    if (!input) return;
    const repository = new IndexedDbLibraryRepository();
    const files = new BrowserAudioFileSource(
      createInputFileChooser(input),
      repository,
      androidPackagedAssets ? "android" : "ios-pwa",
    );
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
      setStorageMessage(androidPackagedAssets
        ? "Songs and library details are saved in this app and remain after it closes. They are removed if you clear app data or uninstall the app."
        : storage.status === "supported"
          ? storage.granted ? "Persistent storage is granted. Audio copies stay in this app between launches, but iOS can still remove app data."
            : "Persistent storage was not granted. Audio copies stay in this app between launches, but iOS may remove browser data."
          : storage.status === "unsupported" ? "Audio copies stay in this app between launches. This browser cannot request eviction protection, so keep the originals."
            : "Audio copies are stored on this device. Storage eviction protection could not be confirmed; keep the originals.");
      setLoading(false);
    }).catch((error: unknown) => {
      if (!mounted) return;
      setNotice(`The library could not be opened: ${errorMessage(error)}`);
      setLoading(false);
    });

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
  const showMiniPlayer = Boolean(currentTrack && destination !== "player");

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
  const libraryTracks = useMemo(() => {
    if (!library) return [];
    return sortTracks(library.tracks, { field: sortField, direction: sortDirection });
  }, [library, sortDirection, sortField]);
  const matchingPlaylists = useMemo(() => {
    const terms = search.trim().toLocaleLowerCase("en").split(/\s+/u).filter(Boolean);
    if (!library || terms.length === 0) return [];
    return library.playlists.filter((playlist) => {
      const name = playlist.name.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("en");
      return terms.every((term) => name.includes(term.normalize("NFD").replace(/\p{M}/gu, "")));
    });
  }, [library, search]);
  const recentlyAddedTracks = useMemo(() => library?.tracks
    .slice()
    .sort((left, right) => right.addedAt - left.addedAt)
    .slice(0, 2) ?? [], [library]);
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
    const persistence = persistentAudioEnabled && !androidPackagedAssets
      ? await requestBrowserStoragePersistence(navigator.storage)
      : undefined;
    if (result.status === "selected") {
      await refreshLibrary();
      if (persistentAudioEnabled) {
        const storageWarning = androidPackagedAssets
          ? " Files remain in the app until its data is cleared or it is uninstalled."
          : persistence?.status === "supported" ? "" : " iOS may still clear app storage, so keep your originals.";
        tell(`${result.files.length} audio file${result.files.length === 1 ? "" : "s"} copied into this app for playback across launches.${storageWarning}`);
      } else {
        tell(`${result.files.length} file${result.files.length === 1 ? "" : "s"} added. Reselect files after restarting the app.`);
      }
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
    if (persistentAudioEnabled && !androidPackagedAssets) {
      const persistence = await requestBrowserStoragePersistence(navigator.storage);
      if (persistence.status !== "supported") {
        setStorageMessage("Audio copies will be saved on this device, but iOS may clear app data. Keep your original files.");
      }
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
    if (androidPackagedAssets) {
      setStorageMessage("Songs are saved in this app and remain across launches. They are removed if you clear app data or uninstall the app.");
      return;
    }
    const status = await requestBrowserStoragePersistence(navigator.storage);
    setStorageMessage(status.status === "supported"
      ? status.granted ? "Persistent storage is granted. App audio and metadata remain best-effort and can still be deleted."
        : "Persistent storage was not granted. iOS may remove stored audio and metadata; keep original audio and export a metadata backup."
      : status.status === "unsupported" ? "Persistent storage requests are not available in this browser."
        : "The persistent storage request failed. Your music files were not changed.");
  });

  const navItems: { readonly id: Exclude<Destination, "player">; readonly label: string; readonly icon: IconName }[] = [
    { id: "home", label: "Listen", icon: "home" },
    { id: "library", label: "Library", icon: "library" },
    { id: "search", label: "Search", icon: "search" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  const getAudioFile = (trackId: string): File | undefined => {
    const app = runtime.current;
    if (!app) return undefined;
    const selected = app.library.getFile(trackId);
    return selected ? app.files.getFile(selected.reference) : undefined;
  };

  const trackRows = (tracks: readonly TrackMetadata[], options: { readonly queueControls?: boolean; readonly queueIndices?: readonly number[]; readonly playlistId?: string; readonly queueTrackIds?: readonly string[] } = {}): ReactNode => (
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
              else playTrack(track.id, options.playlistId ? selectedPlaylist?.trackIds : options.queueTrackIds);
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
                  const confirmation = persistentAudioEnabled
                    ? `Remove “${track.title}” and its saved audio copy from this app? Your original file is not deleted.`
                    : `Remove “${track.title}” from your library? This does not delete the original audio file.`;
                  if (!window.confirm(confirmation)) return;
                  run(async () => {
                    const app = runtime.current;
                    if (!app) return;
                    await app.library.removeTrack(track.id);
                    await refreshLibrary();
                    tell(persistentAudioEnabled
                      ? "Track and its saved app copy were removed. The original audio file was not deleted."
                      : "Track removed from the library. The original audio file was not deleted.");
                  });
                }} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
    {tracks.length > listLimit && <button type="button" className="button button-secondary show-more" onClick={() => setListLimit((limit) => limit + 100)}>Show 100 more tracks</button>}
    {tracks.length > 0 && <div className="track-list-scroll-spacer" aria-hidden="true" />}
    </>
  );

  const selectedPlaylist: Playlist | undefined = currentPlaylist;
  const playlistTracks = selectedPlaylist && runtime.current
    ? runtime.current.library.getPlaylistTracks(selectedPlaylist.id)
    : [];
  const renderMiniPlayer = (className: string, track: NonNullable<typeof currentTrack>) => (
    <div className={className}>
      <IconButton
        label={`Dismiss mini player and remove ${track.title} from the queue`}
        icon="close"
        className="mini-dismiss"
        onClick={() => run(() => runtime.current?.playback.dismissCurrentTrack() ?? Promise.resolve())}
      />
      <button type="button" className="mini-open" onClick={() => setDestination("player")} aria-label={`Open player: ${track.title}`}>
        <Artwork track={track} file={getAudioFile(track.id)} />
        <span className="mini-copy"><strong>{track.title}</strong><small>{track.artist ?? track.fileName}</small></span>
      </button>
      <IconButton label={player.playback.state === "playing" ? "Pause playback" : "Resume playback"} icon={player.playback.state === "playing" ? "pause" : "play"} className="mini-state" onClick={() => run(() => runtime.current?.playback.togglePlayback() ?? Promise.resolve())} />
      <IconButton label="Next track" icon="next" className="mini-next" onClick={() => run(() => runtime.current?.playback.next() ?? Promise.resolve())} />
    </div>
  );

  return (
    <>
    <div className={`app-shell${destination === "player" ? " player-open" : ""}${pwaUiEnabled ? " pwa-ui" : ""}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="side-rail" aria-label="Main navigation">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); setDestination("home"); }}>
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

      <main id="main-content" className={`main-content${showMiniPlayer ? " has-mini-player" : ""}`} tabIndex={-1}>
        {destination !== "home" && destination !== "library" && <header className="topbar">
          <div className="topbar-heading">
            {destination === "player" && <IconButton label="Back to library" icon="back" onClick={() => setDestination("library")} />}
            {destination === "playlists" && selectedPlaylist && <IconButton label="Back to playlists" icon="back" onClick={() => setSelectedPlaylistId(null)} />}
            <h1>{destination === "player" ? "Now Playing" : destination === "search" ? "Search" : destination === "playlists" ? "Playlists" : destination === "queue" ? "Queue" : "Settings"}</h1>
          </div>
        </header>}

        {notice && <div className="toast" role="status"><span>{notice}</span><IconButton label="Dismiss message" icon="close" onClick={() => setNotice("")} /></div>}
        {loading ? (
          <section className="loading-state" aria-live="polite"><span className="loading-orb" /><p>Opening your local library…</p></section>
        ) : !library ? (
          <section className="error-state"><h2>Your library could not be opened</h2><p>{notice || "Reload the app to try again."}</p></section>
        ) : (
          <>
            {destination === "home" && (
              <section className="view-section home-view" aria-labelledby="home-heading">
                <div className="home-welcome">
                  <div><p className="section-kicker">YOUR MUSIC, ALWAYS WITH YOU</p><h1 id="home-heading">Good evening</h1><p className="collection-count">A little space for the music you love.</p></div>
                  <button type="button" className="button button-secondary home-add-button" onClick={chooseFiles}><Icon name="plus" /> <span>Add music</span></button>
                </div>
                <div className="home-section-heading"><h3>Your Playlists</h3><button type="button" className="text-button" onClick={() => setDestination("playlists")}>{library.playlists.length ? "See All" : "Create"}</button></div>
                {library.playlists.length > 0 ? <div className="recent-grid">
                  {library.playlists.slice(0, 3).map((playlist, index) => <button type="button" className="recent-card" key={playlist.id} onClick={() => { setSelectedPlaylistId(playlist.id); setDestination("playlists"); }}>
                    <img className="recent-cover" src={figmaAsset(["playlist-night-drive.svg", "playlist-blue-hour.svg", "playlist-focus-flow.svg"][index]!)} alt="" width="104" height="104" loading="lazy" />
                    <strong>{playlist.name}</strong><small>{playlist.trackIds.length} {playlist.trackIds.length === 1 ? "track" : "tracks"}</small>
                  </button>)}
                </div> : <button type="button" className="home-recent-empty" onClick={() => setDestination("playlists")}>Create a playlist to bring your music together.</button>}
                {library.tracks.length > 0 ? <>
                  <div className="home-section-heading"><h3>Made for You</h3><button type="button" className="text-button" onClick={() => setDestination("playlists")}>Playlists</button></div>
                  <div className="featured-card">
                    <img src={figmaAsset("featured-glow.svg")} alt="" width="140" height="140" />
                    <div><p className="section-kicker">YOUR COLLECTION</p><h3>{library.tracks.length} {library.tracks.length === 1 ? "track" : "tracks"}, ready to play</h3><p>Music you chose, kept on this device.</p></div>
                    <button type="button" className="featured-play" aria-label="Play your collection" onClick={() => library.tracks[0] && playTrack(library.tracks[0].id, library.tracks.map((track) => track.id))}><Icon name="play" size={24} /></button>
                  </div>
                  <div className="home-section-heading"><h3>Recently Added</h3><button type="button" className="text-button" onClick={() => setDestination("library")}>See All</button></div>
                  <div className="home-track-list">{trackRows(recentlyAddedTracks)}</div>
                </> : <div className="home-empty"><div className="empty-art"><Icon name="music" size={30} /></div><h3>Your music starts here</h3><p>Add audio from your device to build your library. Your files stay on this device.</p><button type="button" className="button button-primary" onClick={chooseFiles}><Icon name="plus" /> Add music</button></div>}
              </section>
            )}

            {destination === "library" && (
              <section className="view-section" aria-labelledby="library-heading">
                <div className="collection-heading">
                  <div><h2 id="library-heading">Listen offline.</h2><p className="collection-count">{library.tracks.length} {library.tracks.length === 1 ? "track" : "tracks"} in your collection</p></div>
                  {libraryTracks.length > 0 && <button type="button" className="button button-primary" onClick={() => playTrack(libraryTracks[0]!.id, libraryTracks.map((track) => track.id))}><Icon name="play" /> Play collection</button>}
                </div>
                <div className="library-tools">
                  <div className="sort-controls">
                    <button type="button" className="button button-secondary library-add-button" aria-label="Add music" title="Add music" onClick={chooseFiles}><Icon name="plus" /><span>Add music</span></button>
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
                        <Icon name="chevron-down" size={17} />
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
                <div className="scroll-panel library-track-panel" role="region" aria-label="Music library" tabIndex={0}>
                  {unavailableCount > 0 && (
                    <div className="recovery-banner" role="status">
                      <span className="recovery-icon"><Icon name="music" /></span>
                      <div><strong>{unavailableCount} file{unavailableCount === 1 ? "" : "s"} need access again</strong><p>{persistentAudioEnabled ? "The saved audio copy is missing. Reselect the original files to restore playback in this app." : "File access did not survive the app restart. Reselect the original files to restore playback."}</p></div>
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
                            run(async () => {
                              const app = runtime.current;
                              if (!app) return;
                              await app.library.linkTrackToFile(trackId, pending.file);
                              setPendingRelinks((items) => items.filter((item) => item.file.track.id !== pending.file.track.id));
                              await refreshLibrary();
                            });
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
                  {libraryTracks.length > 0 ? trackRows(libraryTracks, { queueTrackIds: libraryTracks.map((track) => track.id) }) : (
                    <div className="empty-state">
                      <div className="empty-art"><Icon name="music" size={34} /></div>
                      <h3>Your music belongs here</h3>
                      <p>{persistentAudioEnabled ? "Choose audio files to copy into this app for offline playback. Keep your originals as a backup." : "Choose audio files from your device. Reselect them after restarting the app."}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {destination === "search" && (
              <section className={`view-section search-view${search ? " search-results-view" : ""}`} aria-labelledby="search-heading">
                <div className="screen-intro"><h1 id="search-heading">Search</h1><p>Find a track, artist, album, or playlist.</p></div>
                <div className="search-field search-screen-field"><Icon name="search" /><label className="visually-hidden" htmlFor="music-search">Search your library</label><input id="music-search" name="music-search" autoComplete="off" value={search} onChange={(event) => { setSearch(event.currentTarget.value); setListLimit(100); }} placeholder="Songs, artists, albums…" /><button type="button" className={`clear-search${search ? " is-visible" : ""}`} aria-label="Clear search" onClick={() => setSearch("")} disabled={!search}><Icon name="close" size={17} /></button></div>
                {!search && <><h3 className="browse-heading">Browse Categories</h3><div className="category-grid">{musicCategories.map((category) => {
                  const isPlaylistCategory = !("term" in category);
                  const categoryTrackCount = isPlaylistCategory ? 0 : getCategoryTracks(library.tracks, category.term).length;
                  const trackCountLabel = categoryTrackCount === 1 ? "1 track" : `${categoryTrackCount} tracks`;
                  return (
                    <button
                      type="button"
                      key={category.name}
                      className={`category-card ${category.tone}`}
                      aria-label={isPlaylistCategory ? "Open playlists" : `Play a random ${category.name} mix`}
                      disabled={!isPlaylistCategory && categoryTrackCount === 0}
                      onClick={() => {
                        if (isPlaylistCategory) {
                          setDestination("playlists");
                          return;
                        }
                        const queue = getRandomCategoryQueue(library.tracks, category.term);
                        if (queue.length > 0) playTrack(queue[0]!.id, queue.map((track) => track.id));
                      }}
                    >
                      <span className="category-card-visual">
                        <span className="category-card-icon"><Icon name={isPlaylistCategory ? "playlist" : "music"} size={22} /></span>
                        {!isPlaylistCategory && <span className="category-card-play"><Icon name="play" size={17} /></span>}
                      </span>
                      <span className="category-card-copy">
                        <strong>{category.name}</strong>
                        <small>{isPlaylistCategory
                          ? `${library.playlists.length} ${library.playlists.length === 1 ? "playlist" : "playlists"}`
                          : `${trackCountLabel} · random mix`}</small>
                      </span>
                    </button>
                  );
                })}</div></>}
                {search && <>
                  <div className="home-section-heading search-results-heading"><h3>Results</h3></div>
                  <div className="scroll-panel search-results" role="region" aria-label="Search results" tabIndex={0}>
                    {matchingPlaylists.length > 0 && <ul className="playlist-list playlist-search-results">{matchingPlaylists.map((playlist) => <li key={playlist.id}><button type="button" className="playlist-card" onClick={() => { setSelectedPlaylistId(playlist.id); setDestination("playlists"); }}><span className="playlist-art"><Icon name="playlist" /></span><span><strong>{playlist.name}</strong><small>{playlist.trackIds.length} {playlist.trackIds.length === 1 ? "track" : "tracks"}</small></span><Icon name="back" /></button></li>)}</ul>}
                    {visibleTracks.length > 0 ? trackRows(visibleTracks) : matchingPlaylists.length === 0 && <div className="empty-state compact-empty"><div className="empty-art"><Icon name="search" size={30} /></div><h3>No matches found</h3><p>Try a different title, artist, album, or playlist.</p><button type="button" className="button button-secondary" onClick={() => setSearch("")}>Clear search</button></div>}
                  </div>
                </>}
              </section>
            )}

            {destination === "player" && (
              <section
                ref={playerViewRef}
                className={`player-view${playerDragOffset > 0 ? " player-view-pulling" : ""}`}
                aria-label="Now Playing"
                style={playerDragOffset > 0 ? { transform: `translate3d(0, ${playerDragOffset}px, 0)`, transition: "none" } : undefined}
                onPointerDown={onPlayerPointerDown}
                onPointerMove={onPlayerPointerMove}
                onPointerUp={onPlayerPointerUp}
                onPointerCancel={onPlayerPointerCancel}
                onTouchStart={onPlayerTouchStart}
                onTouchMove={onPlayerTouchMove}
                onTouchEnd={onPlayerTouchEnd}
                onTouchCancel={onPlayerTouchCancel}
              >
                <div className="player-dismiss-row">
                  <button type="button" className="player-return-button" onClick={() => setDestination("library", true)} aria-label="Back to library"><Icon name="back" size={18} /> Library</button>
                  <div className="player-drag-hint" aria-hidden="true"><span className="player-drag-indicator" /> Pull down to return</div>
                </div>
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
                <div className="section-heading"><div><h2>Queue</h2><p className="collection-count">{player.queue.trackIds.length} queued tracks</p></div><button type="button" className="button button-secondary" onClick={() => { const tracksToAdd = sortTracks(library.tracks, { field: sortField, direction: sortDirection }); runtime.current?.playback.enqueue(tracksToAdd.map((track) => track.id)); tell(`${tracksToAdd.length} track${tracksToAdd.length === 1 ? "" : "s"} added to the queue.`); }} disabled={library.tracks.length === 0}><Icon name="plus" /> Add library</button></div>
                <div className="scroll-panel" role="region" aria-label="Playback queue" tabIndex={0}>
                  {player.queue.trackIds.length ? trackRows(player.queue.trackIds.flatMap((id) => {
                    const track = library.tracks.find((item) => item.id === id);
                    return track ? [track] : [];
                  }), { queueControls: true, queueIndices: player.queue.trackIds.flatMap((id, index) => library.tracks.some((track) => track.id === id) ? [index] : []) }) : <div className="empty-state compact-empty"><div className="empty-art"><Icon name="queue" size={30} /></div><h3>Your queue is clear</h3><p>Add tracks from your library or start a collection.</p><button type="button" className="button button-primary" onClick={() => setDestination("library")}>Browse library</button></div>}
                </div>
              </section>
            )}

            {destination === "playlists" && (
              <section className={`view-section${selectedPlaylist ? " playlist-detail-view" : ""}`}>
                {selectedPlaylist ? (
                  <>
                    <img className="playlist-detail-cover" src={figmaAsset("playlist-cover.svg")} alt="" width="206" height="206" />
                    <div className="section-heading"><div className="playlist-title-wrap"><div><p className="section-kicker">PLAYLIST</p><h2>{selectedPlaylist.name}</h2><p className="collection-count">{playlistTracks.length} tracks</p></div></div>                    <button type="button" className="button button-danger" onClick={() => {
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
                    <div className="scroll-panel" role="region" aria-label={`${selectedPlaylist.name} tracks`} tabIndex={0}>
                      {playlistTracks.length ? trackRows(playlistTracks, { playlistId: selectedPlaylist.id }) : <div className="empty-state compact-empty"><h3>This playlist is empty</h3><p>Add tracks from your local library.</p></div>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="section-heading"><div><h2>Playlists</h2><p className="collection-count">Your music, arranged your way</p></div></div>
                    <form className="playlist-create-form" onSubmit={createPlaylist}>
                      <label className="visually-hidden" htmlFor="new-playlist-name">New playlist name</label>
                      <input id="new-playlist-name" name="playlist-name" autoComplete="off" value={newPlaylistName} onChange={(event) => setNewPlaylistName(event.currentTarget.value)} placeholder="Name a new playlist…" maxLength={80} />
                      <button type="submit" className="button button-primary" disabled={!newPlaylistName.trim()}><Icon name="plus" /> Create playlist</button>
                    </form>
                    <div className="scroll-panel" role="region" aria-label="Your playlists" tabIndex={0}>
                      {library.playlists.length ? (
                        <ul className="playlist-list">{library.playlists.map((playlist) => (
                          <li key={playlist.id}><button type="button" className="playlist-card" onClick={() => setSelectedPlaylistId(playlist.id)}><span className="playlist-art"><Icon name="playlist" /></span><span><strong>{playlist.name}</strong><small>{playlist.trackIds.length} {playlist.trackIds.length === 1 ? "track" : "tracks"}</small></span><Icon name="back" /></button></li>
                        ))}</ul>
                      ) : <div className="empty-state compact-empty"><div className="empty-art"><Icon name="playlist" size={30} /></div><h3>No playlists yet</h3><p>Create a playlist to bring favorite tracks together.</p></div>}
                    </div>
                  </>
                )}
              </section>
            )}

            {destination === "settings" && (
              <section className="view-section settings-view">
                <div className="section-heading"><div><h2>Settings</h2><p className="collection-count">Keep your library private and recoverable.</p></div></div>
                <div className="scroll-panel settings-panel" role="region" aria-label="Settings" tabIndex={0}>
                  <div className="settings-group">
                    <h3>Appearance</h3>
                    <div className="setting-row"><span><strong>Light mode</strong><small>Current theme: {lightMode ? "Light" : "Dark"}. Saved on this device.</small></span><button type="button" role="switch" aria-label="Light mode" aria-checked={lightMode} className={`switch${lightMode ? " switch-on" : ""}`} onClick={() => setLightMode((current) => !current)}><span /></button></div>
                  </div>
                  <div className="settings-group">
                    <h3>Playback</h3>
                    <div className="setting-row"><span><strong>Shuffle</strong><small>Change the order of upcoming tracks.</small></span><button type="button" role="switch" aria-label="Shuffle" aria-checked={settings.shuffleEnabled} className={`switch${settings.shuffleEnabled ? " switch-on" : ""}`} onClick={toggleShuffle}><span /></button></div>
                    <div className="setting-row"><span><strong>Repeat</strong><small>Current mode: {settings.repeatMode === "off" ? "Off" : settings.repeatMode === "queue" ? "Queue" : "Track"}.</small></span><button type="button" className="button button-secondary" onClick={cycleRepeat}>Change</button></div>
                  </div>
                  <div className="settings-group">
                    <h3>Library backup</h3>
                    <p className="setting-copy">{persistentAudioEnabled ? "Backups include track details and playlists, not audio. Audio copies are stored only in this app and are not included in metadata backups." : "Backups include track details and playlists, not audio files or file-access permissions."}</p>
                    <div className="setting-actions"><button type="button" className="button button-secondary" onClick={exportBackup}><Icon name="download" /> Export metadata</button><button type="button" className="button button-secondary" onClick={() => backupInput.current?.click()}><Icon name="upload" /> Import backup</button></div>
                  </div>
                  <div className="settings-group">
                    <h3>{androidPackagedAssets ? "App storage" : "Browser storage"}</h3>
                    <p className="setting-copy">{storageMessage}</p>
                    {!androidPackagedAssets && <button type="button" className="button button-secondary" onClick={requestPersistence}>Request persistent storage</button>}
                  </div>
                  <div className="settings-group">
                    <h3>About and privacy</h3>
                    <p className="setting-copy">Offline Music · Version {appVersion.trim()} development build</p>
                    <p className="setting-copy">{persistentAudioEnabled ? persistencePrivacyMessage : "Audio access is session-only and may need to be restored after restarting the app. Audio is not copied into browser storage."} Background playback depends on browser and platform behavior and has not been confirmed on your device.</p>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
        {showMiniPlayer && currentTrack ? renderMiniPlayer(`mini-player${pwaUiEnabled ? " pwa-inline-mini-player" : ""}`, currentTrack) : null}
      </main>

      <input ref={fileInput} className="hidden-input" type="file" name="audio-files" aria-label="Choose audio files" accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus" multiple />
      <input ref={backupInput} className="hidden-input" type="file" name="metadata-backup" aria-label="Choose metadata backup" accept="application/json,.json" onChange={importBackup} />
    </div>
    {createPortal(
      pwaUiEnabled ? (
        <div className="pwa-dock">
          {showMiniPlayer && currentTrack ? renderMiniPlayer("mini-player pwa-dock-mini-player", currentTrack) : null}
          <nav className="bottom-nav pwa-bottom-nav" aria-label="Main navigation">
            {navItems.map((item) => <button key={item.id} type="button" className={`bottom-nav-item${destination === item.id ? " selected" : ""}`} aria-current={destination === item.id ? "page" : undefined} onClick={() => setDestination(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}
          </nav>
        </div>
      ) : (
        <nav className="bottom-nav" aria-label="Main navigation">
          {navItems.map((item) => <button key={item.id} type="button" className={`bottom-nav-item${destination === item.id ? " selected" : ""}`} aria-current={destination === item.id ? "page" : undefined} onClick={() => setDestination(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}
        </nav>
      ),
      document.body,
    )}
    </>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("The app root element is missing.");
const reactRoot = createRoot(rootElement);
if (import.meta.hot) import.meta.hot.dispose(() => reactRoot.unmount());
reactRoot.render(<AppBootstrap />);
import appVersion from "../../../VERSION?raw";
