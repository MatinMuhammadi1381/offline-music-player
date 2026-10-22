import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowMiniPlayer } from "../src/mini-player-state.ts";

test("shows the mini-player while a track is selected outside the player screen", () => {
  assert.equal(shouldShowMiniPlayer(true, "library"), true);
  assert.equal(shouldShowMiniPlayer(true, "home"), true);
});

test("hides the mini-player when no current track remains or the full player is open", () => {
  assert.equal(shouldShowMiniPlayer(false, "library"), false);
  assert.equal(shouldShowMiniPlayer(true, "player"), false);
});
