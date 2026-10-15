import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  OPERATING_INPUT_HISTORY_MAX_AGE_MS,
  OPERATING_INPUT_HISTORY_STATE_KEY,
  OPERATING_INPUT_HISTORY_VERSION,
  readOperatingInputHistory,
  resolveOperatingInputInitialization,
  writeOperatingInputHistory,
  type OperatingInputHistoryFields,
  type OperatingInputHistorySession,
  type OperatingInputHistorySnapshot,
} from "../src/lib/finance/operatingInputHistory";

const NOW = 1_800_000_000_000;
const MODULE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/lib/finance/operatingInputHistory.ts",
);

const nextTree = { segment: "operating-outlook" };

const distinctive: OperatingInputHistoryFields = {
  monthlyRevenue: "10000.50",
  variableCostRatePercent: "1e2",
  monthlyFixedCosts: "5000.00",
};

const examples: OperatingInputHistoryFields = {
  monthlyRevenue: "10000",
  variableCostRatePercent: "30",
  monthlyFixedCosts: "5000",
};

function memoryHistory(
  initial: Record<string, unknown> | null = {
    __NA: true,
    __PRIVATE_NEXTJS_INTERNALS_TREE: nextTree,
  },
): OperatingInputHistorySession & {
  current(): Record<string, unknown> | null;
} {
  let state = initial;

  return {
    getState() {
      return state;
    },
    replaceState(next) {
      state = next;
    },
    current() {
      return state;
    },
  };
}

function snapshot(
  history: ReturnType<typeof memoryHistory>,
): OperatingInputHistorySnapshot {
  const state = history.current();
  const value = state?.[OPERATING_INPUT_HISTORY_STATE_KEY];

  if (value == null || typeof value !== "object") {
    throw new Error("expected a snapshot");
  }

  return value as OperatingInputHistorySnapshot;
}

function assertNextFields(history: ReturnType<typeof memoryHistory>) {
  const state = history.current();

  assert.equal(state?.__NA, true);
  assert.equal(state?.__PRIVATE_NEXTJS_INTERNALS_TREE, nextTree);
}

test("a valid snapshot restores the exact entered strings", () => {
  const history = memoryHistory();
  const invalidText: OperatingInputHistoryFields = {
    monthlyRevenue: "abc",
    variableCostRatePercent: " 1e2 ",
    monthlyFixedCosts: "",
  };
  const written = writeOperatingInputHistory(
    "operating-outlook",
    invalidText,
    history,
    NOW,
  );
  const saved = snapshot(history);
  const read = readOperatingInputHistory(
    "operating-outlook",
    history,
    NOW,
  );

  assert.deepEqual(written, { ok: true });
  assert.equal(saved.v, OPERATING_INPUT_HISTORY_VERSION);
  assert.equal(saved.route, "operating-outlook");
  assert.equal(saved.writtenAt, NOW);
  assert.deepEqual(saved.fields, invalidText);
  assert.deepEqual(read, { ok: true, fields: invalidText });
  assertNextFields(history);
  assert.equal(JSON.stringify(saved).includes("operatingProfit"), false);
  assert.equal(JSON.stringify(saved).includes("breakEven"), false);
});

test("decimal and scientific text is not reserialized", () => {
  const history = memoryHistory();

  writeOperatingInputHistory(
    "operating-resilience",
    distinctive,
    history,
    NOW,
  );

  assert.deepEqual(
    readOperatingInputHistory("operating-resilience", history, NOW),
    { ok: true, fields: distinctive },
  );
  assert.equal(snapshot(history).fields.monthlyRevenue, "10000.50");
  assert.equal(snapshot(history).fields.variableCostRatePercent, "1e2");
  assert.equal(snapshot(history).fields.monthlyFixedCosts, "5000.00");
});

test("an unsupported version is rejected and removed", () => {
  const history = memoryHistory();

  writeOperatingInputHistory("operating-outlook", distinctive, history, NOW);
  const state = history.current();

  assert.ok(state);
  history.replaceState({
    ...state,
    [OPERATING_INPUT_HISTORY_STATE_KEY]: {
      ...snapshot(history),
      v: 2,
    },
  });

  assert.deepEqual(
    readOperatingInputHistory("operating-outlook", history, NOW),
    { ok: false, reason: "unsupported-version" },
  );
  assert.equal(
    OPERATING_INPUT_HISTORY_STATE_KEY in (history.current() ?? {}),
    false,
  );
  assertNextFields(history);
});

test("a route mismatch is rejected and removed", () => {
  const history = memoryHistory();

  writeOperatingInputHistory("operating-outlook", distinctive, history, NOW);

  assert.deepEqual(
    readOperatingInputHistory("operating-resilience", history, NOW),
    { ok: false, reason: "route-mismatch" },
  );
  assert.equal(
    OPERATING_INPUT_HISTORY_STATE_KEY in (history.current() ?? {}),
    false,
  );
  assertNextFields(history);
});

test("a malformed snapshot is rejected and removed", () => {
  const history = memoryHistory();
  const state = history.current();

  assert.ok(state);
  history.replaceState({
    ...state,
    [OPERATING_INPUT_HISTORY_STATE_KEY]: ["10000.50", "1e2", "5000.00"],
  });

  assert.deepEqual(
    readOperatingInputHistory("operating-outlook", history, NOW),
    { ok: false, reason: "malformed" },
  );
  assertNextFields(history);
  assert.equal(JSON.stringify(history.current()).includes("10000.50"), false);
});

test("extra snapshot and field keys are rejected and removed", () => {
  const history = memoryHistory();

  writeOperatingInputHistory("operating-outlook", distinctive, history, NOW);
  const state = history.current();

  assert.ok(state);
  history.replaceState({
    ...state,
    [OPERATING_INPUT_HISTORY_STATE_KEY]: {
      ...snapshot(history),
      fields: {
        ...distinctive,
        operatingProfit: "2000",
      },
    },
  });

  assert.deepEqual(
    readOperatingInputHistory("operating-outlook", history, NOW),
    { ok: false, reason: "extra-fields" },
  );
  assert.equal(JSON.stringify(history.current()).includes("2000"), false);
  assertNextFields(history);
});

test("the snapshot remains usable at 15 minutes and expires one millisecond later", () => {
  const history = memoryHistory();

  writeOperatingInputHistory("operating-outlook", distinctive, history, NOW);

  assert.deepEqual(
    readOperatingInputHistory(
      "operating-outlook",
      history,
      NOW + OPERATING_INPUT_HISTORY_MAX_AGE_MS,
    ),
    { ok: true, fields: distinctive },
  );

  assert.deepEqual(
    readOperatingInputHistory(
      "operating-outlook",
      history,
      NOW + OPERATING_INPUT_HISTORY_MAX_AGE_MS + 1,
    ),
    { ok: false, reason: "expired" },
  );
  assert.equal(
    OPERATING_INPUT_HISTORY_STATE_KEY in (history.current() ?? {}),
    false,
  );
  assertNextFields(history);
});

test("a future-dated snapshot is rejected and removed", () => {
  const history = memoryHistory();

  writeOperatingInputHistory("operating-outlook", distinctive, history, NOW);

  assert.deepEqual(
    readOperatingInputHistory("operating-outlook", history, NOW - 1),
    { ok: false, reason: "future-dated" },
  );
  assertNextFields(history);
  assert.equal(JSON.stringify(history.current()).includes("10000.50"), false);
});

test("invalid timestamps are rejected without restoring strings", () => {
  const history = memoryHistory();

  writeOperatingInputHistory("operating-outlook", distinctive, history, NOW);
  const state = history.current();

  assert.ok(state);
  history.replaceState({
    ...state,
    [OPERATING_INPUT_HISTORY_STATE_KEY]: {
      ...snapshot(history),
      writtenAt: Number.POSITIVE_INFINITY,
    },
  });

  const read = readOperatingInputHistory("operating-outlook", history, NOW);

  assert.deepEqual(read, { ok: false, reason: "invalid-timestamp" });
  assert.equal(JSON.stringify(read).includes("10000.50"), false);
  assertNextFields(history);
});

test("a missing history API fails closed without throwing", () => {
  const written = writeOperatingInputHistory(
    "operating-outlook",
    distinctive,
    undefined,
    NOW,
  );
  const read = readOperatingInputHistory(
    "operating-outlook",
    undefined,
    NOW,
  );

  assert.deepEqual(written, { ok: false, reason: "history-unavailable" });
  assert.deepEqual(read, { ok: false, reason: "history-unavailable" });
  assert.equal(JSON.stringify(written).includes("10000.50"), false);
  assert.equal(JSON.stringify(read).includes("10000.50"), false);
});

test("null history state is left untouched", () => {
  let replaced = false;
  const history: OperatingInputHistorySession = {
    getState() {
      return null;
    },
    replaceState() {
      replaced = true;
    },
  };

  assert.deepEqual(
    writeOperatingInputHistory("operating-outlook", distinctive, history, NOW),
    { ok: false, reason: "history-unavailable" },
  );
  assert.equal(replaced, false);
});

test("Next.js history fields survive a write and a removal", () => {
  const history = memoryHistory();

  writeOperatingInputHistory("operating-outlook", distinctive, history, NOW);
  assertNextFields(history);

  const state = history.current();

  assert.ok(state);
  history.replaceState({
    ...state,
    [OPERATING_INPUT_HISTORY_STATE_KEY]: { v: 2 },
  });
  readOperatingInputHistory("operating-outlook", history, NOW);
  assertNextFields(history);
});

test("a failed removal does not restore the strings", () => {
  const history = memoryHistory();

  writeOperatingInputHistory("operating-outlook", distinctive, history, NOW);
  history.replaceState = () => {
    throw new Error("replace failed");
  };

  const state = history.current();

  assert.ok(state);
  state[OPERATING_INPUT_HISTORY_STATE_KEY] = { v: 2 };

  const read = readOperatingInputHistory("operating-outlook", history, NOW);

  assert.deepEqual(read, { ok: false, reason: "removal-failed" });
  assert.equal(JSON.stringify(read).includes("10000.50"), false);
  assert.equal(state.__NA, true);
});

test("reset replaces the snapshot with the example strings", () => {
  const history = memoryHistory();

  writeOperatingInputHistory("operating-outlook", distinctive, history, NOW);
  writeOperatingInputHistory("operating-outlook", examples, history, NOW + 10);

  assert.deepEqual(
    readOperatingInputHistory("operating-outlook", history, NOW + 10),
    { ok: true, fields: examples },
  );
  assertNextFields(history);
});

test("an explicit handoff wins and does not refresh the history timestamp", () => {
  const selected = resolveOperatingInputInitialization(
    { ok: true, fields: distinctive },
    { ok: true, fields: examples },
    examples,
  );

  assert.deepEqual(selected, {
    source: "handoff",
    fields: distinctive,
    carried: true,
    writeHistory: true,
  });

  const fromHistory = resolveOperatingInputInitialization(
    { ok: false },
    { ok: true, fields: distinctive },
    examples,
  );

  assert.deepEqual(fromHistory, {
    source: "history",
    fields: distinctive,
    carried: false,
    writeHistory: false,
  });

  const fromExamples = resolveOperatingInputInitialization(
    { ok: false },
    { ok: false },
    examples,
  );

  assert.deepEqual(fromExamples, {
    source: "example",
    fields: examples,
    carried: false,
    writeHistory: false,
  });
});

test("the history module does not use storage, pushState, or network APIs", () => {
  const source = fs
    .readFileSync(MODULE_PATH, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  assert.equal(source.includes("localStorage"), false);
  assert.equal(source.includes("sessionStorage"), false);
  assert.equal(source.includes(".pushState"), false);
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("console."), false);
  assert.equal(source.includes("document."), false);
  assert.equal(source.includes(OPERATING_INPUT_HISTORY_STATE_KEY), true);
});
