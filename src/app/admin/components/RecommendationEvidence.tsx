import type {
  LinkedRecommendationSnapshot,
} from "@/lib/recommendationSnapshotRepository";

type Props = {
  snapshots: LinkedRecommendationSnapshot[];
};

function formatDate(value: Date | string) {
  const date =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);

  return date;
}

export default function RecommendationEvidence({
  snapshots,
}: Props) {
  if (snapshots.length === 0) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Linked Evidence
        </h2>

        <p className="mt-3 text-sm text-slate-600">
          No evidence snapshots are linked to this recommendation yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        Linked Evidence
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Stored Search Console observations associated with this
        recommendation.
      </p>

      <div className="mt-6 space-y-6">
        {snapshots.map((snapshot) => {
          const historical =
            snapshot.relationship_type ===
            "historical-reconstruction";

          return (
            <div
              key={snapshot.link_id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-bold text-slate-900">
                  Snapshot #{snapshot.snapshot_id}
                </p>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    historical
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {historical
                    ? "Historical Reconstruction"
                    : "Analysis-Time Evidence"}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-600">
                Reporting period:{" "}
                <strong>
                  {formatDate(snapshot.evidence_start)}
                  {" to "}
                  {formatDate(snapshot.evidence_end)}
                </strong>
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Collected:{" "}
                {new Date(
                  snapshot.collected_at
                ).toLocaleString("en-US", {
                  timeZone: "UTC",
                  timeZoneName: "short",
                })}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="Impressions"
                  value={Number(
                    snapshot.impressions
                  ).toLocaleString()}
                />

                <Metric
                  label="Clicks"
                  value={Number(
                    snapshot.clicks
                  ).toLocaleString()}
                />

                <Metric
                  label="CTR"
                  value={`${(
                    Number(snapshot.ctr) * 100
                  ).toFixed(2)}%`}
                />

                <Metric
                  label="Average Position"
                  value={Number(
                    snapshot.position
                  ).toFixed(1)}
                />
              </div>

              {historical && (
                <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  This snapshot was retrieved after the original
                  recommendation. Its values may differ from the
                  evidence available when the AI analysis was
                  performed. Do not interpret differences as
                  performance growth.
                </p>
              )}

              {snapshot.notes && (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Evidence Provenance
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {snapshot.notes}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}