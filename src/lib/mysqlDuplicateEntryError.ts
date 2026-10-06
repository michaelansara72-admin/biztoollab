export const mysqlDuplicateEntryCode = "ER_DUP_ENTRY";

export const mysqlDuplicateEntryErrno = 1062;

export const implementationPlanDuplicateEntryClientError =
  "An implementation plan already exists for this experiment.";

export const implementationPlanCreateFailureClientError =
  "The implementation plan could not be created.";

export function isMysqlDuplicateEntryError(
  error: unknown
): boolean {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return false;
  }

  const code = Reflect.get(error, "code");
  const errno = Reflect.get(error, "errno");

  if (code === mysqlDuplicateEntryCode) {
    return true;
  }

  return errno === mysqlDuplicateEntryErrno;
}

export function implementationPlanCreateFailure(
  error: unknown
): {
  status: 409 | 500;
  error: string;
} {
  if (isMysqlDuplicateEntryError(error)) {
    return {
      status: 409,
      error: implementationPlanDuplicateEntryClientError,
    };
  }

  return {
    status: 500,
    error: implementationPlanCreateFailureClientError,
  };
}
