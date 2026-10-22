export type Destination = "home" | "library" | "search" | "playlists" | "queue" | "settings" | "player";

export function shouldShowMiniPlayer(hasCurrentTrack: boolean, destination: Destination): boolean {
  return hasCurrentTrack && destination !== "player";
}
