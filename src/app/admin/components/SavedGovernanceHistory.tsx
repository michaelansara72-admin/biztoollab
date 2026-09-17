import type {
  SavedAiRecommendation,
} from "@/lib/aiRecommendationRepository";

import type {
  SavedHumanDecision,
} from "@/lib/humanDecisionRepository";

type Props = {
  recommendation: SavedAiRecommendation;
  latestDecision: SavedHumanDecision | null;
  decisions: SavedHumanDecision[];
};

const decisionLabels = {
  "review-experiment": "Review Experiment",
  "monitor-longer": "Monitor Longer",
  modify: "Modify",
  reject: "Reject",
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

export default function SavedGovernanceHistory({
  recommendation,
  latestDecision,
  decisions,
}: Props) {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
            Saved Governance History
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Recommendation #{recommendation.id}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            A permanent record of AI recommendations
            and your decisions.
          </p>
        </div>

        <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
          Saved in MySQL
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">
            Evidence Period
          </p>

          <p className="mt-2 font-semibold text-slate-900">
            {formatDate(recommendation.evidence_start)}
            {" – "}
            {formatDate(recommendation.evidence_end)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">
            AI Assessment
          </p>

          <p className="mt-2 font-semibold capitalize text-slate-900">
            {recommendation.ai_governance_status.replaceAll(
              "-",
              " "
            )}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">
            Your Latest Decision
          </p>

          <p className="mt-2 font-semibold text-slate-900">
            {latestDecision
              ? decisionLabels[latestDecision.decision]
              : "Awaiting Decision"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">
          Original AI Recommendation
        </h3>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {recommendation.recommendation}
        </p>
      </div>

      {latestDecision && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-bold uppercase text-emerald-800">
            Human Decision #{latestDecision.id}
          </p>

          <h3 className="mt-2 text-xl font-bold text-slate-900">
            {decisionLabels[latestDecision.decision]}
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Recorded {formatDate(latestDecision.created_at)}
          </p>

          <p className="mt-4 text-sm font-bold text-slate-700">
            Your Reasoning
          </p>

          <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
            {latestDecision.notes ||
              "No additional reasoning was recorded."}
          </p>
        </div>
      )}

      {decisions.length > 1 && (
        <div className="mt-6">
          <h3 className="font-bold text-slate-900">
            Previous Decisions
          </h3>

          <div className="mt-3 space-y-3">
            {decisions.slice(1).map((decision) => (
              <div
                key={decision.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="font-semibold text-slate-900">
                  Decision #{decision.id}:{" "}
                  {decisionLabels[decision.decision]}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(decision.created_at)}
                </p>

                {decision.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {decision.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500">
        This record documents governance decisions.
        It does not authorize automatic production changes.
      </p>
    </section>
  );
}