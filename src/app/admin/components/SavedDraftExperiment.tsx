import type {
  SavedExperiment,
} from "@/lib/experimentRepository";
import ExperimentLifecycleControls from "./ExperimentLifecycleControls";
type Props = {
  experiment: SavedExperiment;
};

function formatDate(value: Date | string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatStatus(status: string) {
  return status
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

export default function SavedDraftExperiment({
  experiment,
}: Props) {
  return (
    <section className="mt-8 rounded-2xl border border-violet-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-violet-700">
            Controlled Experiment Planning
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Experiment #{experiment.id}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            This experiment has been saved for
            governance review and controlled planning.
          </p>
        </div>

        <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-800">
          {formatStatus(experiment.status)}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">
            Recommendation
          </p>

          <p className="mt-2 font-semibold text-slate-900">
            #{experiment.recommendation_id}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">
            Authorizing Decision
          </p>

          <p className="mt-2 font-semibold text-slate-900">
            #{experiment.source_decision_id}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">
            Created
          </p>

          <p className="mt-2 font-semibold text-slate-900">
            {formatDate(experiment.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 p-5">
        <p className="text-xs font-bold uppercase text-slate-500">
          Experiment
        </p>

        <h3 className="mt-2 text-xl font-bold text-slate-900">
          {experiment.title}
        </h3>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">
          Hypothesis
        </h3>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {experiment.hypothesis}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">
          Proposed Change
        </h3>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {experiment.proposed_change}
        </p>
      </div>

      {experiment.control_description && (
        <div className="mt-4 rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900">
            Control
          </h3>

          <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
            {experiment.control_description}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">
          Success Metric
        </h3>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {experiment.success_metric}
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">
              Baseline
            </p>

            <p className="mt-2 font-semibold text-slate-900">
              {experiment.baseline_value ||
                "Not established yet"}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">
              Target
            </p>

            <p className="mt-2 font-semibold text-slate-900">
              {experiment.target_value ||
                "Not established yet"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
  <p className="font-bold text-amber-900">
    {experiment.status === "draft"
      ? "Human review remains required."
      : experiment.status === "ready-for-review"
        ? "Human approval remains required."
        : experiment.status === "approved"
          ? "Experiment approved for the governed next step."
          : "Experiment rejected."}
  </p>

  <p className="mt-2 text-sm leading-6 text-amber-800">
    {experiment.status === "draft"
      ? "This saved experiment is a planning artifact. Draft status does not authorize implementation, deployment, or automatic production changes."
      : experiment.status === "ready-for-review"
        ? "This experiment is under human review. Review status does not authorize implementation, deployment, or automatic production changes."
        : experiment.status === "approved"
          ? "Approval records a human governance decision. It does not by itself perform or deploy a production change."
          : "This experiment has been rejected and is not authorized for implementation."}
  </p>
</div>
            <ExperimentLifecycleControls
        experimentId={experiment.id}
        status={experiment.status}
      />
    </section>
  );
}
