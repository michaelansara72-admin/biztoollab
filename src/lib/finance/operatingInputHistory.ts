/**
 * Per-history-entry copy of the three operating-calculator input strings.
 *
 * The snapshot lives on the current `history.state` object under
 * `biztoollabOperatingInputs`. It is how a remounted calculator restores
 * what the user typed after Back or Forward. It is not the one-time
 * sessionStorage handoff. Explicit transfers still use that handoff.
 *
 * Precedence for a freshly mounted calculator:
 * 1. A successful one-time handoff.
 * 2. A valid snapshot on this history entry for this route.
 * 3. The example amounts.
 *
 * `history.state` is readable by any script on this origin. This module
 * does not encrypt it. A browser can keep the entry across a refresh or
 * a restored tab session. The 15-minute limit only decides whether a
 * snapshot may be restored. It does not make the browser delete the entry
 * at that instant. An invalid or expired snapshot is removed from the
 * state object when `replaceState` succeeds. This is not secure storage
 * and it is not a confidentiality guarantee.
 *
 * Next.js stores its own navigation metadata on the same state object.
 * Writes copy that object and change only this module's property. This
 * module does not call `pushState` and does not read storage during import.
 * Nothing here puts the strings in a URL, cookie, analytics event, log,
 * or database.
 */

export const OPERATING_INPUT_HISTORY_STATE_KEY = "biztoollabOperatingInputs";

export const OPERATING_INPUT_HISTORY_VERSION = 1 as const;

export const OPERATING_INPUT_HISTORY_MAX_AGE_MS = 15 * 60 * 1000;

export const OPERATING_INPUT_HISTORY_ROUTES = [
  "operating-outlook",
  "operating-resilience",
] as const;

export type OperatingInputHistoryRoute =
  (typeof OPERATING_INPUT_HISTORY_ROUTES)[number];

export type OperatingInputHistoryFields = {
  monthlyRevenue: string;
  variableCostRatePercent: string;
  monthlyFixedCosts: string;
};

export type OperatingInputHistorySnapshot = {
  v: typeof OPERATING_INPUT_HISTORY_VERSION;
  route: OperatingInputHistoryRoute;
  writtenAt: number;
  fields: OperatingInputHistoryFields;
};

export type OperatingInputHistorySession = {
  getState(): unknown;
  replaceState(state: Record<string, unknown> | null): void;
};

export type OperatingInputHistoryWriteFailureReason =
  | "invalid-route"
  | "invalid-fields"
  | "invalid-timestamp"
  | "history-unavailable";

export type OperatingInputHistoryWriteResult =
  | { ok: true }
  | { ok: false; reason: OperatingInputHistoryWriteFailureReason };

export type OperatingInputHistoryReadFailureReason =
  | "invalid-route"
  | "invalid-timestamp"
  | "history-unavailable"
  | "missing"
  | "malformed"
  | "unsupported-version"
  | "route-mismatch"
  | "missing-fields"
  | "invalid-field-type"
  | "extra-fields"
  | "expired"
  | "future-dated"
  | "removal-failed";

export type OperatingInputHistoryReadResult =
  | { ok: true; fields: OperatingInputHistoryFields }
  | { ok: false; reason: OperatingInputHistoryReadFailureReason };

export type OperatingInputInitialization = {
  source: "handoff" | "history" | "example";
  fields: OperatingInputHistoryFields;
  carried: boolean;
  writeHistory: boolean;
};

const SNAPSHOT_KEYS = ["v", "route", "writtenAt", "fields"] as const;

const FIELD_KEYS = [
  "monthlyRevenue",
  "variableCostRatePercent",
  "monthlyFixedCosts",
] as const;

type SnapshotRejection = {
  ok: false;
  reason: Exclude<
    OperatingInputHistoryReadFailureReason,
    "invalid-route" | "history-unavailable" | "missing" | "removal-failed"
  >;
};

export function writeOperatingInputHistory(
  route: OperatingInputHistoryRoute,
  fields: OperatingInputHistoryFields,
  session?: OperatingInputHistorySession,
  now: number = Date.now(),
): OperatingInputHistoryWriteResult {
  if (!isRoute(route)) {
    return { ok: false, reason: "invalid-route" };
  }

  if (!isUsableTimestamp(now)) {
    return { ok: false, reason: "invalid-timestamp" };
  }

  const validated = exactFields(fields);

  if (validated === null) {
    return { ok: false, reason: "invalid-fields" };
  }

  const target = resolveSession(session);

  if (target === null) {
    return { ok: false, reason: "history-unavailable" };
  }

  const state = readState(target);

  if (state === null) {
    return { ok: false, reason: "history-unavailable" };
  }

  const snapshot: OperatingInputHistorySnapshot = {
    v: OPERATING_INPUT_HISTORY_VERSION,
    route,
    writtenAt: now,
    fields: validated,
  };

  try {
    target.replaceState({
      ...state,
      [OPERATING_INPUT_HISTORY_STATE_KEY]: snapshot,
    });
  } catch {
    return { ok: false, reason: "history-unavailable" };
  }

  return { ok: true };
}

export function readOperatingInputHistory(
  route: OperatingInputHistoryRoute,
  session?: OperatingInputHistorySession,
  now: number = Date.now(),
): OperatingInputHistoryReadResult {
  if (!isRoute(route)) {
    return { ok: false, reason: "invalid-route" };
  }

  if (!isUsableTimestamp(now)) {
    return { ok: false, reason: "invalid-timestamp" };
  }

  const target = resolveSession(session);

  if (target === null) {
    return { ok: false, reason: "history-unavailable" };
  }

  const state = readState(target);

  if (state === null || !(OPERATING_INPUT_HISTORY_STATE_KEY in state)) {
    return { ok: false, reason: "missing" };
  }

  const inspected = inspectSnapshot(
    state[OPERATING_INPUT_HISTORY_STATE_KEY],
    route,
    now,
  );

  if (inspected.ok) {
    return { ok: true, fields: inspected.fields };
  }

  try {
    const nextState = { ...state };
    delete nextState[OPERATING_INPUT_HISTORY_STATE_KEY];
    target.replaceState(nextState);
  } catch {
    return { ok: false, reason: "removal-failed" };
  }

  return { ok: false, reason: inspected.reason };
}

/**
 * Choose the strings a calculator shows on mount.
 * A successful handoff wins, then a valid history snapshot, then examples.
 * Only a handoff asks the caller to write a new snapshot. Reading history
 * must not refresh its timestamp.
 */
export function resolveOperatingInputInitialization(
  handoff: { ok: true; fields: OperatingInputHistoryFields } | { ok: false },
  history: { ok: true; fields: OperatingInputHistoryFields } | { ok: false },
  examples: OperatingInputHistoryFields,
): OperatingInputInitialization {
  if (handoff.ok) {
    return {
      source: "handoff",
      fields: handoff.fields,
      carried: true,
      writeHistory: true,
    };
  }

  if (history.ok) {
    return {
      source: "history",
      fields: history.fields,
      carried: false,
      writeHistory: false,
    };
  }

  return {
    source: "example",
    fields: examples,
    carried: false,
    writeHistory: false,
  };
}

function resolveSession(
  session: OperatingInputHistorySession | undefined,
): OperatingInputHistorySession | null {
  if (session) {
    return session;
  }

  return browserHistory();
}

function browserHistory(): OperatingInputHistorySession | null {
  try {
    const history = globalThis.history;

    if (
      history == null ||
      typeof history.replaceState !== "function" ||
      typeof history.state === "undefined"
    ) {
      return null;
    }

    return {
      getState() {
        return history.state;
      },
      replaceState(state) {
        history.replaceState(state, "");
      },
    };
  } catch {
    return null;
  }
}

function readState(
  session: OperatingInputHistorySession,
): Record<string, unknown> | null {
  try {
    const state = session.getState();

    if (!isPlainObject(state)) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

function inspectSnapshot(
  value: unknown,
  route: OperatingInputHistoryRoute,
  now: number,
): { ok: true; fields: OperatingInputHistoryFields } | SnapshotRejection {
  if (!isPlainObject(value)) {
    return reject("malformed");
  }

  const snapshotKeys = keyDifference(value, SNAPSHOT_KEYS);

  if (snapshotKeys === "extra") {
    return reject("extra-fields");
  }

  if (snapshotKeys === "missing") {
    return reject("malformed");
  }

  if (typeof value.v !== "number" || !Number.isFinite(value.v)) {
    return reject("malformed");
  }

  if (value.v !== OPERATING_INPUT_HISTORY_VERSION) {
    return reject("unsupported-version");
  }

  if (typeof value.route !== "string" || !isRoute(value.route)) {
    return reject("malformed");
  }

  if (value.route !== route) {
    return reject("route-mismatch");
  }

  if (typeof value.writtenAt !== "number" || !Number.isFinite(value.writtenAt)) {
    return reject("invalid-timestamp");
  }

  if (value.writtenAt < 0) {
    return reject("invalid-timestamp");
  }

  if (value.writtenAt > now) {
    return reject("future-dated");
  }

  if (now - value.writtenAt > OPERATING_INPUT_HISTORY_MAX_AGE_MS) {
    return reject("expired");
  }

  if (!isPlainObject(value.fields)) {
    return reject("missing-fields");
  }

  const fieldKeys = keyDifference(value.fields, FIELD_KEYS);

  if (fieldKeys === "extra") {
    return reject("extra-fields");
  }

  if (fieldKeys === "missing") {
    return reject("missing-fields");
  }

  const fields = exactFields(value.fields);

  if (fields === null) {
    return reject("invalid-field-type");
  }

  return { ok: true, fields };
}

function exactFields(value: unknown): OperatingInputHistoryFields | null {
  if (!isPlainObject(value) || keyDifference(value, FIELD_KEYS) !== "ok") {
    return null;
  }

  const monthlyRevenue = value.monthlyRevenue;
  const variableCostRatePercent = value.variableCostRatePercent;
  const monthlyFixedCosts = value.monthlyFixedCosts;

  if (
    typeof monthlyRevenue !== "string" ||
    typeof variableCostRatePercent !== "string" ||
    typeof monthlyFixedCosts !== "string"
  ) {
    return null;
  }

  return {
    monthlyRevenue,
    variableCostRatePercent,
    monthlyFixedCosts,
  };
}

function reject(reason: SnapshotRejection["reason"]): SnapshotRejection {
  return { ok: false, reason };
}

function isRoute(value: string): value is OperatingInputHistoryRoute {
  return (OPERATING_INPUT_HISTORY_ROUTES as readonly string[]).includes(value);
}

function isUsableTimestamp(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function keyDifference(
  value: Record<string, unknown>,
  allowed: readonly string[],
): "ok" | "extra" | "missing" {
  const allowedSet = new Set<string>(allowed);

  if (Object.keys(value).some((key) => !allowedSet.has(key))) {
    return "extra";
  }

  if (allowed.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) {
    return "missing";
  }

  return "ok";
}
