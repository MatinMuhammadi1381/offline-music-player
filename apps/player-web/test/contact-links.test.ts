import assert from "node:assert/strict";
import test from "node:test";
import { CONTACT_LINKS } from "../src/contact-links.ts";

test("contact links open each supplied social profile and phone number", () => {
  assert.deepEqual(
    CONTACT_LINKS.map(({ label, value, href }) => [label, value, href]),
    [
      ["Telegram", "@matinmuhamady23", "https://t.me/matinmuhamady23"],
      ["Instagram", "matin_muhammadi.2001", "https://instagram.com/matin_muhammadi.2001"],
      ["Phone 1", "09038049915", "tel:09038049915"],
      ["Phone 2", "09186682824", "tel:09186682824"],
      ["GitHub", "matinmuhammadi1381", "https://github.com/matinmuhammadi1381"],
    ],
  );
});

test("only social profile links open in a new tab", () => {
  assert.deepEqual(CONTACT_LINKS.map(({ external }) => external), [true, true, false, false, true]);
});
