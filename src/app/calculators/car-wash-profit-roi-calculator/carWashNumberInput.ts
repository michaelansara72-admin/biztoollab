const completeNonNegativePattern = /^(?:\d+\.\d+|\d+|\.\d+)$/;

export function parseCompleteCarWashNumber(
  raw: string
): number | null {
  if (!completeNonNegativePattern.test(raw)) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function commitCarWashNumberInput(raw: string): number {
  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, parsed);
}
