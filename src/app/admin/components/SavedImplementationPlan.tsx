import type {
  SavedImplementationPlan,
} from "@/lib/implementationPlanRepository";

type Props = {
  implementationPlan: SavedImplementationPlan;
};

function formatStatus(
  status: SavedImplementationPlan["status"]
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

export default function SavedImplementationPlan({
  implementationPlan,
}: Props) {
  const productionAuthorized =
    Boolean(
      implementationPlan.production_authorized
    );

  return (
    <section className="mt-8 rounded-2xl border border-sky-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky-700">
            Saved Implementation Plan
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {implementationPlan.title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Implementation Plan #
            {implementationPlan.id}
            {" · "}
            Experiment #
            {implementationPlan.experiment_id}
            {" · "}
            Recommendation #
            {implementationPlan.recommendation_id}
          </p>
        </div>

        <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-800">
          {formatStatus(
            implementationPlan.status
          )}
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 p-5">
        <p className="text-xs font-bold uppercase text-slate-500">
          Target
        </p>

        <p className="mt-2 break-all font-semibold text-slate-900">
          {implementationPlan.target_path}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">
          Proposed Changes
        </h3>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {
            implementationPlan.proposed_changes
          }
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">
          Protected Elements
        </h3>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {
            implementationPlan.protected_elements
          }
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">
          Measurement Plan
        </h3>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {
            implementationPlan.measurement_plan
          }
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">
          Rollback Plan
        </h3>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {implementationPlan.rollback_plan}
        </p>
      </div>

      <div
        className={
          productionAuthorized
            ? "mt-6 rounded-xl border border-rose-300 bg-rose-50 p-5"
            : "mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5"
        }
      >
        <p
          className={
            productionAuthorized
              ? "font-bold text-rose-950"
              : "font-bold text-amber-950"
          }
        >
          {productionAuthorized
            ? "Production authorization recorded"
            : "Production is not authorized"}
        </p>

        <p
          className={
            productionAuthorized
              ? "mt-2 text-sm leading-6 text-rose-900"
              : "mt-2 text-sm leading-6 text-amber-900"
          }
        >
          {productionAuthorized
            ? "This implementation plan contains an explicit production authorization record."
            : "This implementation plan is a governance artifact only. It does not authorize code changes, deployment, or autonomous production modification."}
        </p>
      </div>
    </section>
  );
}
