export type Destination = "home" | "library" | "search" | "playlists" | "queue" | "settings" | "player";

export type PlayerOpenBounds = Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">;

export function shouldShowMiniPlayer(hasCurrentTrack: boolean, destination: Destination): boolean {
  return hasCurrentTrack && destination !== "player";
}

export function getMiniPlayerOpeningOrigin(miniPlayer: PlayerOpenBounds, playerView: PlayerOpenBounds): { readonly x: number; readonly y: number } {
  return {
    x: miniPlayer.left + miniPlayer.width / 2 - playerView.left,
    y: miniPlayer.top + miniPlayer.height / 2 - playerView.top,
  };
}
