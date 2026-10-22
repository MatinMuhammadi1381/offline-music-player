import assert from "node:assert/strict";
import test from "node:test";
import {
  createCategoryAssignments,
  getCategoryTracks,
  getRandomCategoryQueue,
  parseCategoryAssignments,
  reconcileCategoryAssignments,
} from "../src/category-playback.ts";
import type { CategoryAssignments } from "../src/category-playback.ts";
import type { TrackMetadata } from "@offline-music-player/shared-types";

const categories = ["Chill", "Focus", "Electronic", "Indie", "Ambient"] as const;
const makeTracks = (count: number): readonly TrackMetadata[] => Array.from({ length: count }, (_, index) => ({
  id: `track-${index + 1}`,
  title: `Track ${index + 1}`,
  fileName: `track-${index + 1}.mp3`,
  fileSizeBytes: 1,
  addedAt: index + 1,
}));

function sequenceRandom(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}

function assertExactPartition(
  assignments: CategoryAssignments,
  trackIds: readonly string[],
  categoryNames: readonly string[],
): void {
  const values = categoryNames.flatMap((category) => [...(assignments.categories[category] ?? [])]);
  assert.equal(values.length, new Set(values).size, "a track is assigned to at most one category");
  assert.deepEqual([...values].sort(), [...trackIds].sort(), "categories contain every library track exactly once");
  assert.deepEqual(Object.keys(assignments.categories).sort(), [...categoryNames].sort());
}

test("random category partitions are disjoint, complete, and have varied random sizes", () => {
  const tracks = makeTracks(15);
  const randomValues = [...Array(14).fill(0), 0, 0.18, 0.765, 0.875];
  const assignments = createCategoryAssignments(tracks.map((track) => track.id), categories, sequenceRandom(randomValues));

  assertExactPartition(assignments, tracks.map((track) => track.id), categories);
  assert.deepEqual(categories.map((name) => assignments.categories[name]!.length), [0, 3, 10, 1, 1]);
  assert.deepEqual(
    categories.map((name) => createCategoryAssignments(tracks.map((track) => track.id), categories, () => 0).categories[name]!.length),
    [0, 0, 0, 0, 15],
  );
  const initial = reconcileCategoryAssignments(
    createCategoryAssignments([], categories, () => 0),
    tracks.map((track) => track.id),
    categories,
    sequenceRandom(randomValues),
  );
  assert.deepEqual(categories.map((name) => initial.categories[name]!.length), [0, 3, 10, 1, 1]);
});

test("empty and single-track libraries produce valid partitions", () => {
  assertExactPartition(createCategoryAssignments([], categories, () => 0), [], categories);
  const single = createCategoryAssignments(["only-track"], categories, () => 0.7);
  assertExactPartition(single, ["only-track"], categories);
  assert.equal(categories.reduce((sum, name) => sum + single.categories[name]!.length, 0), 1);
});

test("category assignments round-trip and remain stable across reloads", () => {
  const trackIds = makeTracks(15).map((track) => track.id);
  const original = createCategoryAssignments(trackIds, categories, () => 0.5);
  const reloaded = parseCategoryAssignments(JSON.stringify(original), categories);

  assert.deepEqual(reloaded, original);
  assert.equal(reconcileCategoryAssignments(reloaded!, trackIds, categories), reloaded);
});

test("library additions are assigned once and removals are pruned without reshuffling existing tracks", () => {
  const originalIds = makeTracks(3).map((track) => track.id);
  const original = createCategoryAssignments(originalIds, categories, () => 0.5);
  const addedId = "new-track";
  const updatedIds = [...originalIds, addedId];
  const updated = reconcileCategoryAssignments(original, updatedIds, categories, () => 0.4);
  assertExactPartition(updated, updatedIds, categories);
  for (const trackId of originalIds) {
    assert.equal(
      categories.find((name) => original.categories[name]!.includes(trackId)),
      categories.find((name) => updated.categories[name]!.includes(trackId)),
    );
  }

  const remainingIds = originalIds.slice(1);
  const afterRemoval = reconcileCategoryAssignments(updated, remainingIds, categories, () => 0.2);
  assertExactPartition(afterRemoval, remainingIds, categories);
});

test("category playback only shuffles its assigned tracks", () => {
  const tracks = makeTracks(4);
  const categoryTracks = getCategoryTracks(tracks, ["track-2", "track-4"]);
  assert.deepEqual(categoryTracks.map((track) => track.id), ["track-2", "track-4"]);
  assert.deepEqual(
    getRandomCategoryQueue(categoryTracks, () => 0).map((track) => track.id),
    ["track-4", "track-2"],
  );
});

test("persisted category data and random sources are validated", () => {
  assert.equal(parseCategoryAssignments("{not json", categories), null);
  assert.equal(parseCategoryAssignments(JSON.stringify({ schemaVersion: 2, categories: {} }), categories), null);
  assert.throws(() => createCategoryAssignments(["track-1"], categories, () => 1), RangeError);
  assert.throws(() => getRandomCategoryQueue(makeTracks(2), () => -1), RangeError);
});
