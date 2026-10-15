import {
  calculateOperatingOutlook,
  type OperatingOutlookInput,
} from "./calculateOperatingOutlook";
import { calculateOperatingResilience } from "./calculateOperatingResilience";
import { parseOperatingOutlookNumber } from "./operatingOutlookMessages";

/**
 * One-time handoff of the three operating-calculator field strings.
 *
 * sessionStorage is browser-tab-scoped convenience storage. It is not
 * encryption and it is not a security boundary. A duplicated tab may inherit
 * a copy of that tab's storage at the moment the tab is opened.
 *
 * A payload is usable for 15 minutes after `writtenAt`. That limit is checked
 * when a caller consumes the key. It does not make the browser delete the key
 * at that instant. If nobody reads the key, the browser keeps it until the
 * tab session ends. A consume call removes the key itself, including a
 * malformed or expired payload. This module does not start a timer.
 *
 * Nothing here reads storage during import or server rendering. Storage is
 * touched only when `writeOperatingInputHandoff` or
 * `consumeOperatingInputHandoff` runs, and only through the storage argument
 * or, when that argument is omitted, `globalThis.sessionStorage`.
 *
 * Callers must write only after an explicit user action. Do not put these
 * amounts in a URL, cookie, analytics event, log, or database.
 *
 * React Strict Mode can run a destination effect twice in development and
 * drop state from the first run. The first successful consume removes the
 * payload, so the second call finds nothing. The UI has to keep the first
 * successful field strings in component state, or in another place that
 * survives that replay. This module does not use React, and the writing page
 * must not consume the key it just wrote: a same-source read is rejected and
 * the key is removed.
 */

export const OPERATING_INPUT_HANDOFF_STORAGE_KEY =
  "biztoollab.operating-input-handoff";

export const OPERATING_INPUT_HANDOFF_VERSION = 1 as const;

export const OPERATING_INPUT_HANDOFF_MAX_AGE_MS = 15 * 60 * 1000;

export const OPERATING_INPUT_HANDOFF_TOOLS = [
  "operating-outlook",
  "operating-resilience",
] as const;

export type OperatingInputHandoffTool =
  (typeof OPERATING_INPUT_HANDOFF_TOOLS)[number];

export type OperatingInputHandoffFields = {
  monthlyRevenue: string;
  variableCostRatePercent: string;
  monthlyFixedCosts: string;
};

export type OperatingInputHandoffPayload = {
  v: typeof OPERATING_INPUT_HANDOFF_VERSION;
  source: OperatingInputHandoffTool;
  writtenAt: number;
  fields: OperatingInputHandoffFields;
};

/**
 * The three Storage methods this handoff uses. Tests pass a fake.
 * Production callers can omit it and use sessionStorage.
 */
export type OperatingInputHandoffStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type OperatingInputHandoffWriteFailureReason =
  | "invalid-source"
  | "invalid-input"
  | "storage-unavailable";

export type OperatingInputHandoffWriteResult =
  | { ok: true }
  | { ok: false; reason: OperatingInputHandoffWriteFailureReason };

export type OperatingInputHandoffConsumeFailureReason =
  | "invalid-destination"
  | "missing"
  | "malformed"
  | "unsupported-version"
  | "unknown-source"
  | "same-source"
  | "missing-fields"
  | "invalid-field-type"
  | "extra-fields"
  | "invalid-timestamp"
  | "expired"
  | "future-dated"
  | "invalid-input"
  | "storage-unavailable"
  | "storage-removal-failed";

export type OperatingInputHandoffConsumeResult =
  | { ok: true; fields: OperatingInputHandoffFields }
  | { ok: false; reason: OperatingInputHandoffConsumeFailureReason };

const PAYLOAD_KEYS = ["v", "source", "writtenAt", "fields"] as const;

const FIELD_KEYS = [
  "monthlyRevenue",
  "variableCostRatePercent",
  "monthlyFixedCosts",
] as const;

type PayloadRejection = {
  ok: false;
  reason: Exclude<
    OperatingInputHandoffConsumeFailureReason,
    | "invalid-destination"
    | "missing"
    | "storage-unavailable"
    | "storage-removal-failed"
  >;
};

type InspectedPayload =
  | { ok: true; fields: OperatingInputHandoffFields }
  | PayloadRejection;

export function writeOperatingInputHandoff(
  source: OperatingInputHandoffTool,
  fields: OperatingInputHandoffFields,
  storage?: OperatingInputHandoffStorage,
  now: number = Date.now(),
): OperatingInputHandoffWriteResult {
  if (!isTool(source)) {
    return { ok: false, reason: "invalid-source" };
  }

  if (!Number.isFinite(now) || now < 0) {
    return { ok: false, reason: "invalid-input" };
  }

  const validated = validateFields(fields, [source, otherTool(source)]);

  if (validated === null) {
    return { ok: false, reason: "invalid-input" };
  }

  const target = resolveStorage(storage);

  if (target === null) {
    return { ok: false, reason: "storage-unavailable" };
  }

  const payload: OperatingInputHandoffPayload = {
    v: OPERATING_INPUT_HANDOFF_VERSION,
    source,
    writtenAt: now,
    fields: validated,
  };

  try {
    target.setItem(
      OPERATING_INPUT_HANDOFF_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    return { ok: false, reason: "storage-unavailable" };
  }

  return { ok: true };
}

export function consumeOperatingInputHandoff(
  destination: OperatingInputHandoffTool,
  storage?: OperatingInputHandoffStorage,
  now: number = Date.now(),
): OperatingInputHandoffConsumeResult {
  if (!isTool(destination)) {
    return { ok: false, reason: "invalid-destination" };
  }

  if (!Number.isFinite(now)) {
    return { ok: false, reason: "invalid-timestamp" };
  }

  const target = resolveStorage(storage);

  if (target === null) {
    return { ok: false, reason: "storage-unavailable" };
  }

  let raw: string;

  try {
    const stored = target.getItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY);

    if (typeof stored !== "string") {
      return { ok: false, reason: "missing" };
    }

    raw = stored;
  } catch {
    return { ok: false, reason: "storage-unavailable" };
  }

  const inspected = inspectPayload(raw, destination, now);
  const removalFailure = removePayload(target);

  if (removalFailure !== null) {
    return removalFailure;
  }

  return inspected;
}

function otherTool(
  tool: OperatingInputHandoffTool,
): OperatingInputHandoffTool {
  return tool === "operating-outlook"
    ? "operating-resilience"
    : "operating-outlook";
}

function isTool(value: unknown): value is OperatingInputHandoffTool {
  return (
    typeof value === "string" &&
    (OPERATING_INPUT_HANDOFF_TOOLS as readonly string[]).includes(value)
  );
}

function resolveStorage(
  storage: OperatingInputHandoffStorage | undefined,
): OperatingInputHandoffStorage | null {
  if (storage !== undefined) {
    return storage;
  }

  return browserSessionStorage();
}

function browserSessionStorage(): OperatingInputHandoffStorage | null {
  try {
    if (typeof globalThis.sessionStorage === "undefined") {
      return null;
    }

    const storage = globalThis.sessionStorage;

    if (storage == null) {
      return null;
    }

    return storage;
  } catch {
    return null;
  }
}

function removePayload(
  storage: OperatingInputHandoffStorage,
): OperatingInputHandoffConsumeResult | null {
  try {
    storage.removeItem(OPERATING_INPUT_HANDOFF_STORAGE_KEY);
    return null;
  } catch {
    return { ok: false, reason: "storage-removal-failed" };
  }
}

function validateFields(
  fields: unknown,
  tools: readonly OperatingInputHandoffTool[],
): OperatingInputHandoffFields | null {
  const strings = readFieldStrings(fields);

  if (strings === null) {
    return null;
  }

  const trimmed: OperatingInputHandoffFields = {
    monthlyRevenue: strings.monthlyRevenue.trim(),
    variableCostRatePercent: strings.variableCostRatePercent.trim(),
    monthlyFixedCosts: strings.monthlyFixedCosts.trim(),
  };
  const revenue = parseOperatingOutlookNumber(trimmed.monthlyRevenue);
  const rate = parseOperatingOutlookNumber(trimmed.variableCostRatePercent);
  const fixed = parseOperatingOutlookNumber(trimmed.monthlyFixedCosts);

  if (!revenue.ok || !rate.ok || !fixed.ok) {
    return null;
  }

  const input: OperatingOutlookInput = {
    monthlyRevenue: revenue.value,
    variableCostRatePercent: rate.value,
    monthlyFixedCosts: fixed.value,
  };

  for (const tool of tools) {
    if (!engineAccepts(tool, input)) {
      return null;
    }
  }

  return trimmed;
}

function readFieldStrings(
  fields: unknown,
): OperatingInputHandoffFields | null {
  if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
    return null;
  }

  const record = fields as {
    monthlyRevenue?: unknown;
    variableCostRatePercent?: unknown;
    monthlyFixedCosts?: unknown;
  };

  if (
    typeof record.monthlyRevenue !== "string" ||
    typeof record.variableCostRatePercent !== "string" ||
    typeof record.monthlyFixedCosts !== "string"
  ) {
    return null;
  }

  return {
    monthlyRevenue: record.monthlyRevenue,
    variableCostRatePercent: record.variableCostRatePercent,
    monthlyFixedCosts: record.monthlyFixedCosts,
  };
}

function engineAccepts(
  tool: OperatingInputHandoffTool,
  input: OperatingOutlookInput,
): boolean {
  if (tool === "operating-resilience") {
    return calculateOperatingResilience(input).ok;
  }

  return calculateOperatingOutlook(input).ok;
}

function inspectPayload(
  raw: string,
  destination: OperatingInputHandoffTool,
  now: number,
): InspectedPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (!isPlainRecord(parsed)) {
    return { ok: false, reason: "malformed" };
  }

  if (parsed.v !== OPERATING_INPUT_HANDOFF_VERSION) {
    if (typeof parsed.v === "number" && Number.isFinite(parsed.v)) {
      return { ok: false, reason: "unsupported-version" };
    }

    return { ok: false, reason: "malformed" };
  }

  const topLevelKeys = Object.keys(parsed);

  if (topLevelKeys.some((key) => !isPayloadKey(key))) {
    return { ok: false, reason: "extra-fields" };
  }

  if (PAYLOAD_KEYS.some((key) => !hasOwn(parsed, key))) {
    return { ok: false, reason: "malformed" };
  }

  const writtenAt = parsed.writtenAt;

  if (!isValidTimestamp(writtenAt)) {
    return { ok: false, reason: "invalid-timestamp" };
  }

  if (writtenAt > now) {
    return { ok: false, reason: "future-dated" };
  }

  if (now - writtenAt > OPERATING_INPUT_HANDOFF_MAX_AGE_MS) {
    return { ok: false, reason: "expired" };
  }

  const source = parsed.source;

  if (!isTool(source)) {
    return { ok: false, reason: "unknown-source" };
  }

  if (source === destination) {
    return { ok: false, reason: "same-source" };
  }

  const fieldRecord = parsed.fields;

  if (!isPlainRecord(fieldRecord)) {
    return { ok: false, reason: "malformed" };
  }

  const fieldKeys = Object.keys(fieldRecord);

  if (FIELD_KEYS.some((key) => !hasOwn(fieldRecord, key))) {
    return { ok: false, reason: "missing-fields" };
  }

  if (FIELD_KEYS.some((key) => typeof fieldRecord[key] !== "string")) {
    return { ok: false, reason: "invalid-field-type" };
  }

  if (fieldKeys.some((key) => !isFieldKey(key))) {
    return { ok: false, reason: "extra-fields" };
  }

  const fields = validateFields(fieldRecord, [destination]);

  if (fields === null) {
    return { ok: false, reason: "invalid-input" };
  }

  return { ok: true, fields };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function isPayloadKey(key: string): key is (typeof PAYLOAD_KEYS)[number] {
  return (PAYLOAD_KEYS as readonly string[]).includes(key);
}

function isFieldKey(key: string): key is (typeof FIELD_KEYS)[number] {
  return (FIELD_KEYS as readonly string[]).includes(key);
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
