import assert from "node:assert/strict";
import test from "node:test";
import { getMiniPlayerOpeningOrigin, shouldShowMiniPlayer } from "../src/mini-player-state.ts";

test("shows the mini-player while a track is selected outside the player screen", () => {
  assert.equal(shouldShowMiniPlayer(true, "library"), true);
  assert.equal(shouldShowMiniPlayer(true, "home"), true);
});

test("hides the mini-player when no current track remains or the full player is open", () => {
  assert.equal(shouldShowMiniPlayer(false, "library"), false);
  assert.equal(shouldShowMiniPlayer(true, "player"), false);
});

test("positions the player opening origin at the mini-player's center", () => {
  assert.deepEqual(
    getMiniPlayerOpeningOrigin(
      { left: 240, top: 700, width: 360, height: 60 },
      { left: 20, top: 40, width: 400, height: 650 },
    ),
    { x: 400, y: 690 },
  );
});
