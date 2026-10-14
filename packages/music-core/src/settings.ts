import type { PlayerSettings, RepeatMode, SortDirection, SortField } from "../../shared-types/src/index.ts";

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = Object.freeze({
  schemaVersion: 1,
  librarySort: Object.freeze({ field: "title", direction: "ascending" }),
  repeatMode: "off",
  shuffleEnabled: false,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validatePlayerSettings(value: unknown): PlayerSettings {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new TypeError("Player settings must be an object with schemaVersion 1.");
  }
  const allowedKeys = ["schemaVersion", "librarySort", "repeatMode", "shuffleEnabled"];
  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) {
    throw new TypeError("Player settings contain unsupported fields.");
  }
  if (!isRecord(value.librarySort)) {
    throw new TypeError("Player settings librarySort must be an object.");
  }
  const sortKeys = ["field", "direction"];
  if (Object.keys(value.librarySort).some((key) => !sortKeys.includes(key))) {
    throw new TypeError("Player settings librarySort contains unsupported fields.");
  }
  const fields: readonly SortField[] = ["title", "artist", "album", "addedAt"];
  const directions: readonly SortDirection[] = ["ascending", "descending"];
  const repeatModes: readonly RepeatMode[] = ["off", "queue", "track"];
  if (!fields.includes(value.librarySort.field as SortField)) {
    throw new TypeError("Player settings librarySort.field is not supported.");
  }
  if (!directions.includes(value.librarySort.direction as SortDirection)) {
    throw new TypeError("Player settings librarySort.direction is not supported.");
  }
  if (!repeatModes.includes(value.repeatMode as RepeatMode)) {
    throw new TypeError("Player settings repeatMode is not supported.");
  }
  if (typeof value.shuffleEnabled !== "boolean") {
    throw new TypeError("Player settings shuffleEnabled must be a boolean.");
  }
  return {
    schemaVersion: 1,
    librarySort: {
      field: value.librarySort.field as SortField,
      direction: value.librarySort.direction as SortDirection,
    },
    repeatMode: value.repeatMode as RepeatMode,
    shuffleEnabled: value.shuffleEnabled,
  };
}
