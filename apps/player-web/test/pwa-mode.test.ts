import assert from "node:assert/strict";
import test from "node:test";
import { isInstalledPwa } from "../src/pwa-mode.ts";

test("recognizes the standard standalone display mode", () => {
  assert.equal(isInstalledPwa(true, false), true);
});

test("recognizes the iOS Home Screen standalone flag", () => {
  assert.equal(isInstalledPwa(false, true), true);
});

test("keeps an ordinary browser tab on the landing page", () => {
  assert.equal(isInstalledPwa(false, false), false);
});
