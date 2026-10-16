import assert from "node:assert/strict";
import test from "node:test";
import { getPlayerGestureDestination } from "../src/player-gesture.ts";

test("returns to the library after a deliberate downward player gesture", () => {
  assert.equal(getPlayerGestureDestination({ x: 120, y: 80 }, { x: 132, y: 190 }), "library");
});

test("keeps the player open when a downward gesture is below the threshold", () => {
  assert.equal(getPlayerGestureDestination({ x: 120, y: 80 }, { x: 126, y: 165 }), "player");
});

test("does not treat horizontal or upward gestures as player dismissal", () => {
  assert.equal(getPlayerGestureDestination({ x: 120, y: 80 }, { x: 250, y: 110 }), "player");
  assert.equal(getPlayerGestureDestination({ x: 120, y: 180 }, { x: 130, y: 40 }), "player");
});
