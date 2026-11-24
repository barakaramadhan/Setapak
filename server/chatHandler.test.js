import assert from "node:assert/strict";
import test from "node:test";
import { rencanaSesuaiTujuan } from "./chatHandler.js";
import { extractTripDestinations } from "../src/utils/tripFacts.js";

test("extracts Mount Merbabu as the trip destination", () => {
  assert.deepEqual(
    extractTripDestinations("Saya ingin mendaki Gunung Merbabu"),
    ["Gunung Merbabu"]
  );
});

test("rejects a plan whose city does not match the requested destination", () => {
  assert.equal(
    rencanaSesuaiTujuan({ city: "Bromo - Lumajang - Malang" }, {
      destinations: ["Gunung Merbabu"],
    }),
    false
  );
  assert.equal(
    rencanaSesuaiTujuan({ city: "Merbabu" }, {
      destinations: ["Gunung Merbabu"],
    }),
    true
  );
});
