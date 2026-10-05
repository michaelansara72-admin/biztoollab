import test from "node:test";
import assert from "node:assert/strict";

import {
  commitCarWashNumberInput,
  parseCompleteCarWashNumber,
} from "../src/app/calculators/car-wash-profit-roi-calculator/carWashNumberInput";

test("complete non-negative numbers can update results immediately", () => {
  assert.equal(parseCompleteCarWashNumber("15"), 15);
  assert.equal(parseCompleteCarWashNumber("15.5"), 15.5);
  assert.equal(parseCompleteCarWashNumber(".5"), 0.5);
  assert.equal(parseCompleteCarWashNumber("0"), 0);
  assert.equal(parseCompleteCarWashNumber("015"), 15);
});

test("incomplete or negative drafts do not commit early", () => {
  assert.equal(parseCompleteCarWashNumber(""), null);
  assert.equal(parseCompleteCarWashNumber("15."), null);
  assert.equal(parseCompleteCarWashNumber("-1"), null);
  assert.equal(parseCompleteCarWashNumber("1e2"), null);
});

test("blur commits empty, invalid, and negative input to zero", () => {
  assert.equal(commitCarWashNumberInput(""), 0);
  assert.equal(commitCarWashNumberInput("abc"), 0);
  assert.equal(commitCarWashNumberInput("-4"), 0);
  assert.equal(commitCarWashNumberInput("15."), 15);
  assert.equal(commitCarWashNumberInput("15.50"), 15.5);
  assert.equal(commitCarWashNumberInput("0"), 0);
});
