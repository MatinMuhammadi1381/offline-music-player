import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isInstalledPwa, isMobilePhone, shouldShowStartupSplash, STARTUP_SPLASH_DURATION_MS } from "../src/pwa-mode.ts";

const pwaUiCss = readFileSync(new URL("../src/pwa-ui.css", import.meta.url), "utf8");

test("recognizes the standard standalone display mode", () => {
  assert.equal(isInstalledPwa(true, false), true);
});

test("recognizes the iOS Home Screen standalone flag", () => {
  assert.equal(isInstalledPwa(false, true), true);
});

test("keeps an ordinary browser tab on the landing page", () => {
  assert.equal(isInstalledPwa(false, false), false);
});

test("recognizes mobile phones without treating tablets or desktop browsers as phones", () => {
  assert.equal(isMobilePhone("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), true);
  assert.equal(isMobilePhone("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36"), true);
  assert.equal(isMobilePhone("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)"), false);
  assert.equal(isMobilePhone("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), false);
});

test("shows the startup splash only in an installed mobile standalone app", () => {
  assert.equal(shouldShowStartupSplash(true, true), true);
  assert.equal(shouldShowStartupSplash(true, false), false);
  assert.equal(shouldShowStartupSplash(false, true), false);
});

test("keeps the startup splash visible for three seconds", () => {
  assert.equal(STARTUP_SPLASH_DURATION_MS, 3_000);
});

test("covers the viewport above the mobile navigation dock", () => {
  const splashRule = pwaUiCss.match(/\.startup-splash\s*\{([^}]*)\}/)?.[1] ?? "";
  const dockZIndex = pwaUiCss.match(/\.pwa-dock\s*\{[^}]*z-index:\s*(\d+)/s)?.[1];
  const splashZIndex = splashRule.match(/z-index:\s*(\d+)/)?.[1];

  assert.match(splashRule, /position:\s*fixed/);
  assert.match(splashRule, /inset:\s*0/);
  assert.ok(dockZIndex);
  assert.ok(splashZIndex);
  assert.ok(Number(splashZIndex) > Number(dockZIndex));
});
