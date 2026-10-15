import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  OPERATING_INPUT_HANDOFF_MAX_AGE_MS,
  OPERATING_INPUT_HANDOFF_STORAGE_KEY,
  OPERATING_INPUT_HANDOFF_VERSION,
  consumeOperatingInputHandoff,
  writeOperatingInputHandoff,
  type OperatingInputHandoffConsumeResult,
  type OperatingInputHandoffFields,
  type OperatingInputHandoffStorage,
  type OperatingInputHandoffTool,
  type OperatingInputHandoffWriteResult,
} from "../src/lib/finance/operatingInputHandoff";

const NOW = 1_800_000_000_000;
const MODULE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/lib/finance/operatingInputHandoff.ts",
);

const exampleFields: OperatingInputHandoffFields = {
  monthlyRevenue: "10000",
  variableCostRatePercent: "30",
  monthlyFixedCosts: "5000",
};

function memoryStorage(): OperatingInputHandoffStorage & {
  values: Map<string, string>;
} {
  const values = new Map<string, string>();

  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function assertNoAmounts(
  result: OperatingInputHandoffWriteResult | OperatingInputHandoffConsumeResult,
  amounts: readonly string[],
) {
  const encoded = JSON.stringify(result);

  for (const amount of amounts) {
    assert.equal(encoded.includes(amount), false);
  }
}

function storedPayload(storage: OperatingInputHandoffStorage) {
  const raw = storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY);

  if (typeof raw !== "string") {
    throw new Error("expected a stored payload string");
  }

  return {
    raw,
    parsed: JSON.parse(raw) as {
      v: number;
      source: string;
      writtenAt: number;
      fields: OperatingInputHandoffFields;
    },
  };
}

function putRaw(storage: OperatingInputHandoffStorage, raw: string) {
  storage.setItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY, raw);
}

function payload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    v: OPERATING_INPUT_HANDOFF_VERSION,
    source: "operating-outlook",
    writtenAt: NOW,
    fields: exampleFields,
    ...overrides,
  });
}

test("A. outlook to resilience handoff preserves the entered strings", () => {
  const storage = memoryStorage();
  const written = writeOperatingInputHandoff(
    "operating-outlook",
    exampleFields,
    storage,
    NOW,
  );
  const saved = storedPayload(storage);

  assert.deepEqual(written, { ok: true });
  assert.deepEqual(Object.keys(saved.parsed).sort(), [
    "fields",
    "source",
    "v",
    "writtenAt",
  ]);
  assert.equal(saved.parsed.v, 1);
  assert.equal(saved.parsed.source, "operating-outlook");
  assert.equal(saved.parsed.writtenAt, NOW);
  assert.deepEqual(saved.parsed.fields, exampleFields);
  assert.equal(saved.raw.includes("operatingProfit"), false);
  assert.equal(saved.raw.includes("breakEven"), false);
  assert.equal(saved.raw.includes("marginOfSafety"), false);
  assert.equal(saved.raw.includes("2000"), false);
  assert.equal(saved.raw.includes("7142"), false);

  const consumed = consumeOperatingInputHandoff(
    "operating-resilience",
    storage,
    NOW,
  );

  assert.deepEqual(consumed, { ok: true, fields: exampleFields });
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
});

test("B. resilience to outlook handoff preserves the entered strings", () => {
  const storage = memoryStorage();
  const fields: OperatingInputHandoffFields = {
    monthlyRevenue: "8100",
    variableCostRatePercent: "30",
    monthlyFixedCosts: "5600",
  };
  const written = writeOperatingInputHandoff(
    "operating-resilience",
    fields,
    storage,
    NOW,
  );

  assert.deepEqual(written, { ok: true });
  assert.equal(storedPayload(storage).parsed.source, "operating-resilience");
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-outlook", storage, NOW),
    { ok: true, fields },
  );
});

test("C. trimmed decimal text is preserved without reserialization", () => {
  const storage = memoryStorage();
  const written = writeOperatingInputHandoff(
    "operating-outlook",
    {
      monthlyRevenue: " 10000.50 ",
      variableCostRatePercent: " 30 ",
      monthlyFixedCosts: " 5000.00 ",
    },
    storage,
    NOW,
  );
  const fields: OperatingInputHandoffFields = {
    monthlyRevenue: "10000.50",
    variableCostRatePercent: "30",
    monthlyFixedCosts: "5000.00",
  };

  assert.deepEqual(written, { ok: true });
  assert.deepEqual(storedPayload(storage).parsed.fields, fields);
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: true, fields },
  );
});

test("D. scientific notation is preserved as typed text", () => {
  const storage = memoryStorage();
  const fields: OperatingInputHandoffFields = {
    monthlyRevenue: "1e2",
    variableCostRatePercent: "30",
    monthlyFixedCosts: "5000",
  };

  assert.deepEqual(
    writeOperatingInputHandoff("operating-outlook", fields, storage, NOW),
    { ok: true },
  );
  assert.equal(storedPayload(storage).parsed.fields.monthlyRevenue, "1e2");
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: true, fields },
  );
});

test("E. one successful consume removes the payload", () => {
  const storage = memoryStorage();

  writeOperatingInputHandoff(
    "operating-outlook",
    exampleFields,
    storage,
    NOW,
  );

  assert.equal(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW).ok,
    true,
  );
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: false, reason: "missing" },
  );
});

test("F. a missing payload stays missing", () => {
  const storage = memoryStorage();
  const result = consumeOperatingInputHandoff(
    "operating-resilience",
    storage,
    NOW,
  );

  assert.deepEqual(result, { ok: false, reason: "missing" });
  assertNoAmounts(result, ["10000", "30", "5000"]);
});

test("G. malformed JSON is rejected and removed", () => {
  const storage = memoryStorage();

  putRaw(storage, "{");

  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: false, reason: "malformed" },
  );
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);

  putRaw(storage, "null");
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: false, reason: "malformed" },
  );

  putRaw(storage, JSON.stringify(["10000", "30", "5000"]));
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: false, reason: "malformed" },
  );
});

test("H. an unsupported numeric version is rejected and removed", () => {
  const storage = memoryStorage();

  putRaw(storage, payload({ v: 2 }));
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: false, reason: "unsupported-version" },
  );
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);

  putRaw(storage, payload({ v: 0 }));
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: false, reason: "unsupported-version" },
  );

  putRaw(storage, payload({ v: "1" }));
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: false, reason: "malformed" },
  );
});

test("I. an unknown source is rejected and removed", () => {
  const storage = memoryStorage();

  putRaw(storage, payload({ source: "operating-cash" }));

  const result = consumeOperatingInputHandoff(
    "operating-resilience",
    storage,
    NOW,
  );

  assert.deepEqual(result, { ok: false, reason: "unknown-source" });
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
  assertNoAmounts(result, ["10000"]);
});

test("J. the writing tool cannot consume its own payload", () => {
  const storage = memoryStorage();

  writeOperatingInputHandoff(
    "operating-outlook",
    exampleFields,
    storage,
    NOW,
  );

  assert.deepEqual(
    consumeOperatingInputHandoff("operating-outlook", storage, NOW),
    { ok: false, reason: "same-source" },
  );
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: false, reason: "missing" },
  );
});

test("K. a missing financial field rejects the whole payload", () => {
  const storage = memoryStorage();

  putRaw(
    storage,
    JSON.stringify({
      v: 1,
      source: "operating-outlook",
      writtenAt: NOW,
      fields: {
        monthlyRevenue: "10000",
        variableCostRatePercent: "30",
      },
    }),
  );

  const result = consumeOperatingInputHandoff(
    "operating-resilience",
    storage,
    NOW,
  );

  assert.deepEqual(result, { ok: false, reason: "missing-fields" });
  assert.equal("fields" in result, false);
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
});

test("L. a non-string financial field is rejected", () => {
  const storage = memoryStorage();

  putRaw(
    storage,
    JSON.stringify({
      v: 1,
      source: "operating-outlook",
      writtenAt: NOW,
      fields: {
        monthlyRevenue: 10000,
        variableCostRatePercent: "30",
        monthlyFixedCosts: "5000",
      },
    }),
  );

  const result = consumeOperatingInputHandoff(
    "operating-resilience",
    storage,
    NOW,
  );

  assert.deepEqual(result, { ok: false, reason: "invalid-field-type" });
  assert.equal("fields" in result, false);
  assertNoAmounts(result, ["10000", "5000"]);
});

test("M. extra top-level and field keys are rejected", () => {
  const storage = memoryStorage();

  putRaw(storage, payload({ note: "carried result" }));
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: false, reason: "extra-fields" },
  );

  putRaw(
    storage,
    JSON.stringify({
      v: 1,
      source: "operating-outlook",
      writtenAt: NOW,
      fields: {
        ...exampleFields,
        operatingProfit: "2000",
      },
    }),
  );
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: false, reason: "extra-fields" },
  );
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
});

test("N. negative revenue is not stored or restored", () => {
  assertRejectedInput({
    monthlyRevenue: "-1",
    variableCostRatePercent: "30",
    monthlyFixedCosts: "5000",
  });
});

test("O. negative fixed costs are not stored or restored", () => {
  assertRejectedInput({
    monthlyRevenue: "10000",
    variableCostRatePercent: "30",
    monthlyFixedCosts: "-1",
  });
});

test("P. a variable-cost rate below zero is not stored or restored", () => {
  assertRejectedInput({
    monthlyRevenue: "10000",
    variableCostRatePercent: "-1",
    monthlyFixedCosts: "5000",
  });
});

test("Q. a variable-cost rate above 100 is not stored or restored", () => {
  assertRejectedInput({
    monthlyRevenue: "10000",
    variableCostRatePercent: "100.01",
    monthlyFixedCosts: "5000",
  });
});

test("R. zero revenue is accepted and the text stays zero", () => {
  const fields: OperatingInputHandoffFields = {
    monthlyRevenue: "0",
    variableCostRatePercent: "30",
    monthlyFixedCosts: "5000",
  };
  const storage = memoryStorage();

  assert.deepEqual(
    writeOperatingInputHandoff("operating-outlook", fields, storage, NOW),
    { ok: true },
  );
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: true, fields },
  );
});

test("S. a 100 percent variable-cost rate is accepted", () => {
  const fields: OperatingInputHandoffFields = {
    monthlyRevenue: "10000",
    variableCostRatePercent: "100",
    monthlyFixedCosts: "5000",
  };
  const storage = memoryStorage();

  assert.deepEqual(
    writeOperatingInputHandoff(
      "operating-resilience",
      fields,
      storage,
      NOW,
    ),
    { ok: true },
  );
  assert.equal(
    storedPayload(storage).parsed.fields.variableCostRatePercent,
    "100",
  );
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-outlook", storage, NOW),
    { ok: true, fields },
  );
});

test("T. the payload remains usable at 15 minutes and expires one millisecond later", () => {
  const atLimit = NOW + OPERATING_INPUT_HANDOFF_MAX_AGE_MS;
  const pastLimit = atLimit + 1;
  const fresh = memoryStorage();

  writeOperatingInputHandoff(
    "operating-outlook",
    exampleFields,
    fresh,
    NOW,
  );
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", fresh, atLimit),
    { ok: true, fields: exampleFields },
  );

  const stale = memoryStorage();

  writeOperatingInputHandoff(
    "operating-outlook",
    exampleFields,
    stale,
    NOW,
  );
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", stale, pastLimit),
    { ok: false, reason: "expired" },
  );
  assert.equal(stale.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
});

test("U. a future-dated payload is rejected and removed", () => {
  const storage = memoryStorage();

  putRaw(storage, payload({ writtenAt: NOW + 1 }));

  const result = consumeOperatingInputHandoff(
    "operating-resilience",
    storage,
    NOW,
  );

  assert.deepEqual(result, { ok: false, reason: "future-dated" });
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
  assertNoAmounts(result, ["10000"]);
});

test("V. invalid timestamps are rejected and removed", () => {
  const storage = memoryStorage();
  const invalidTimestamps = [null, "1800000000000", -1];

  for (const writtenAt of invalidTimestamps) {
    putRaw(storage, payload({ writtenAt }));
    assert.deepEqual(
      consumeOperatingInputHandoff("operating-resilience", storage, NOW),
      { ok: false, reason: "invalid-timestamp" },
    );
    assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
  }

  putRaw(
    storage,
    payload({ writtenAt: Number.POSITIVE_INFINITY }).replace(
      "null",
      "1e309",
    ),
  );
  assert.deepEqual(
    consumeOperatingInputHandoff("operating-resilience", storage, NOW),
    { ok: false, reason: "invalid-timestamp" },
  );
});

test("W. a storage read failure is recoverable and exposes no amounts", () => {
  const storage: OperatingInputHandoffStorage = {
    getItem() {
      throw new Error("10000.50");
    },
    setItem() {},
    removeItem() {},
  };
  const result = consumeOperatingInputHandoff(
    "operating-resilience",
    storage,
    NOW,
  );

  assert.deepEqual(result, { ok: false, reason: "storage-unavailable" });
  assertNoAmounts(result, ["10000.50"]);
});

test("X. a storage write failure is recoverable and exposes no amounts", () => {
  const fields: OperatingInputHandoffFields = {
    monthlyRevenue: "10000.50",
    variableCostRatePercent: "30",
    monthlyFixedCosts: "5000",
  };
  const storage: OperatingInputHandoffStorage = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error(JSON.stringify(fields));
    },
    removeItem() {},
  };
  const result = writeOperatingInputHandoff(
    "operating-outlook",
    fields,
    storage,
    NOW,
  );

  assert.deepEqual(result, { ok: false, reason: "storage-unavailable" });
  assertNoAmounts(result, ["10000.50", "5000"]);
});

test("Y. a removal failure does not report a successful consume", () => {
  const raw = payload();
  const storage: OperatingInputHandoffStorage = {
    getItem() {
      return raw;
    },
    setItem() {},
    removeItem() {
      throw new Error(raw);
    },
  };
  const result = consumeOperatingInputHandoff(
    "operating-resilience",
    storage,
    NOW,
  );

  assert.deepEqual(result, { ok: false, reason: "storage-removal-failed" });
  assert.equal("fields" in result, false);
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), raw);
  assertNoAmounts(result, ["10000", "5000"]);
});

test("Z. one invalid field prevents any partial restoration", () => {
  const fields: OperatingInputHandoffFields = {
    monthlyRevenue: "10000",
    variableCostRatePercent: "abc",
    monthlyFixedCosts: "5000",
  };
  const storage = memoryStorage();
  const written = writeOperatingInputHandoff(
    "operating-outlook",
    fields,
    storage,
    NOW,
  );

  assert.deepEqual(written, { ok: false, reason: "invalid-input" });
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
  assertNoAmounts(written, ["10000", "abc", "5000"]);

  putRaw(
    storage,
    JSON.stringify({
      v: 1,
      source: "operating-outlook",
      writtenAt: NOW,
      fields,
    }),
  );

  const consumed = consumeOperatingInputHandoff(
    "operating-resilience",
    storage,
    NOW,
  );

  assert.deepEqual(consumed, { ok: false, reason: "invalid-input" });
  assert.equal("fields" in consumed, false);
  assertNoAmounts(consumed, ["10000", "abc", "5000"]);
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
});

test("an invalid source does not write, and an invalid destination does not read", () => {
  const storage = memoryStorage();
  let reads = 0;
  const watching: OperatingInputHandoffStorage = {
    getItem(key) {
      reads += 1;
      return storage.getItem(key);
    },
    setItem(key, value) {
      storage.setItem(key, value);
    },
    removeItem(key) {
      storage.removeItem(key);
    },
  };
  const written = writeOperatingInputHandoff(
    "operating-cash" as OperatingInputHandoffTool,
    exampleFields,
    watching,
    NOW,
  );

  assert.deepEqual(written, { ok: false, reason: "invalid-source" });
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
  assertNoAmounts(written, ["10000"]);

  writeOperatingInputHandoff(
    "operating-outlook",
    exampleFields,
    storage,
    NOW,
  );
  reads = 0;

  const consumed = consumeOperatingInputHandoff(
    "operating-cash" as OperatingInputHandoffTool,
    watching,
    NOW,
  );

  assert.deepEqual(consumed, { ok: false, reason: "invalid-destination" });
  assert.equal(reads, 0);
  assert.equal(
    storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY) === null,
    false,
  );
});

test("omitted browser storage fails closed without throwing", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  let reads = 0;

  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    get() {
      reads += 1;
      return undefined;
    },
  });

  try {
    const result = writeOperatingInputHandoff(
      "operating-outlook",
      exampleFields,
      undefined,
      NOW,
    );

    assert.deepEqual(result, { ok: false, reason: "storage-unavailable" });
    assert.equal(reads > 0, true);
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "sessionStorage", descriptor);
    } else {
      delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    }
  }
});

test("injected storage does not touch sessionStorage", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  let reads = 0;

  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    get() {
      reads += 1;
      return undefined;
    },
  });

  try {
    const storage = memoryStorage();

    writeOperatingInputHandoff(
      "operating-outlook",
      exampleFields,
      storage,
      NOW,
    );
    consumeOperatingInputHandoff("operating-resilience", storage, NOW);
    assert.equal(reads, 0);
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "sessionStorage", descriptor);
    } else {
      delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    }
  }
});

test("module evaluation does not read sessionStorage or reimplement the engines", () => {
  const source = fs.readFileSync(MODULE_PATH, "utf8");

  assert.equal(source.includes("localStorage"), false);
  assert.equal(source.includes("window"), false);
  assert.equal(source.includes("document"), false);
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("console."), false);
  assert.equal(source.includes("0.85"), false);
  assert.equal(source.includes("sessionStorage"), true);

  const script = `
    let reads = 0;
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get() {
        reads += 1;
        return undefined;
      },
    });
    await import(${JSON.stringify(pathToFileURL(MODULE_PATH).href)});
    if (reads !== 0) process.exit(2);
  `;
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", script],
    {
      cwd: path.resolve(path.dirname(MODULE_PATH), "../../.."),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
});

function assertRejectedInput(fields: OperatingInputHandoffFields) {
  const storage = memoryStorage();
  const written = writeOperatingInputHandoff(
    "operating-outlook",
    fields,
    storage,
    NOW,
  );

  assert.deepEqual(written, { ok: false, reason: "invalid-input" });
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
  assertNoAmounts(written, Object.values(fields));

  putRaw(
    storage,
    JSON.stringify({
      v: 1,
      source: "operating-outlook",
      writtenAt: NOW,
      fields,
    }),
  );

  const consumed = consumeOperatingInputHandoff(
    "operating-resilience",
    storage,
    NOW,
  );

  assert.deepEqual(consumed, { ok: false, reason: "invalid-input" });
  assert.equal("fields" in consumed, false);
  assertNoAmounts(consumed, Object.values(fields));
  assert.equal(storage.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY), null);
}
