import type {
  ImplementationPlanAuditHistoryView,
  ImplementationPlanStatus,
} from "@/lib/implementationPlanRepository";

type Props = {
  implementationPlanId: number;
  history: ImplementationPlanAuditHistoryView;
};

const auditTimestampMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatImplementationPlanAuditTimestamp(
  value: Date | string
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Timestamp unavailable";
  }

  const month =
    auditTimestampMonths[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const hour = String(
    date.getUTCHours()
  ).padStart(2, "0");
  const minute = String(
    date.getUTCMinutes()
  ).padStart(2, "0");
  const second = String(
    date.getUTCSeconds()
  ).padStart(2, "0");

  return `${month} ${day}, ${year}, ${hour}:${minute}:${second} UTC`;
}

function formatStatus(
  status: ImplementationPlanStatus
) {
  return status
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

export default function ImplementationPlanAuditHistory({
  implementationPlanId,
  history,
}: Props) {
  const records =
    history.status === "ready"
      ? history.records.filter(
          (record) =>
            record.implementationPlanId ===
            implementationPlanId
        )
      : [];

  return (
    <div className="mt-6 rounded-xl border border-slate-200 p-5">
      <h3 className="font-bold text-slate-900">
        Audit History
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Recorded status transitions for
        Implementation Plan #
        {implementationPlanId}. This history
        is read-only.
      </p>

      {history.status === "unavailable" ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-950">
            Audit history is unavailable.
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-900">
            Recorded transitions for this
            implementation plan could not be
            loaded.
          </p>
        </div>
      ) : records.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-slate-700">
          No audit events have been recorded
          for this implementation plan.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {records.map((record) => (
            <li
              key={record.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <p className="font-semibold text-slate-900">
                {formatStatus(
                  record.previousStatus
                )}
                {" → "}
                {formatStatus(record.nextStatus)}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Actor type: {record.actorType}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {formatImplementationPlanAuditTimestamp(
                  record.createdAt
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
