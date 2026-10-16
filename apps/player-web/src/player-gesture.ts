export interface PlayerGesturePoint {
  readonly x: number;
  readonly y: number;
}

export type PlayerGestureDestination = "library" | "player";

export function getPlayerGestureDestination(
  start: PlayerGesturePoint,
  end: PlayerGesturePoint,
  threshold = 96,
): PlayerGestureDestination {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  return deltaY >= threshold && deltaY > Math.abs(deltaX) * 1.25 ? "library" : "player";
}
