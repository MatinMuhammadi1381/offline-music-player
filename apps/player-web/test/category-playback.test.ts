import assert from "node:assert/strict";
import test from "node:test";
import { getCategoryTracks, getRandomCategoryQueue } from "../src/category-playback.ts";
import type { TrackMetadata } from "@offline-music-player/shared-types";

const tracks: readonly TrackMetadata[] = [
  { id: "chill-1", title: "Chill morning", durationMs: 180_000, addedAt: 1 },
  { id: "focus-1", title: "Focus session", durationMs: 190_000, addedAt: 2 },
  { id: "chill-2", title: "Night chill", durationMs: 200_000, addedAt: 3 },
];

test("category mixes use matching tracks and randomize their playback order", () => {
  assert.deepEqual(getCategoryTracks(tracks, "chill").map((track) => track.id), ["chill-1", "chill-2"]);
  assert.deepEqual(
    getRandomCategoryQueue(tracks, "chill", () => 0).map((track) => track.id),
    ["chill-2", "chill-1"],
  );
});

test("category mixes fall back to the full library when no tracks match", () => {
  assert.deepEqual(
    getRandomCategoryQueue(tracks, "ambient", () => 0).map((track) => track.id),
    ["focus-1", "chill-2", "chill-1"],
  );
});

test("category shuffle rejects invalid random sources", () => {
  assert.throws(() => getRandomCategoryQueue(tracks, "chill", () => 1), RangeError);
});
