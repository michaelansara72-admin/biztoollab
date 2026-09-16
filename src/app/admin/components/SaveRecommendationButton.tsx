"use client";

import { useState } from "react";

type RecommendationPayload = {
  source: string;
  siteUrl: string;

  period: {
    startDate: string;
    endDate: string;
  };

  analysis: {
    summary: string;
    evidenceAssessment: string;
    opportunity: string;
    evidence: string;
    recommendation: string;
    experiment: string;
    measurement: string;
    confidence: "low" | "moderate" | "high";
    governanceStatus:
      | "monitor-longer"
      | "candidate-experiment";
  };
};

type HumanDecision =
  | "review-experiment"
  | "monitor-longer"
  | "modify"
  | "reject";

type SaveRecommendationButtonProps = {
  recommendation: RecommendationPayload;
};

const decisionOptions: Array<{
  value: HumanDecision;
  label: string;
  description: string;
}> = [
  {
    value: "review-experiment",
    label: "Review Experiment",
    description:
      "Move this recommendation forward for controlled experiment planning. This does not authorize a production change.",
  },
  {
    value: "monitor-longer",
    label: "Monitor Longer",
    description:
      "Keep the recommendation on record while collecting more evidence before moving forward.",
  },
  {
    value: "modify",
    label: "Modify",
    description:
      "Keep the opportunity under consideration, but revise the proposed approach before proceeding.",
  },
  {
    value: "reject",
    label: "Reject",
    description:
      "Do not pursue this recommendation in its current form.",
  },
];

export default function SaveRecommendationButton({
  recommendation,
}: SaveRecommendationButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const [recommendationId, setRecommendationId] =
    useState<number | null>(null);

  const [selectedDecision, setSelectedDecision] =
    useState<HumanDecision | null>(null);

  const [notes, setNotes] = useState("");

  const [decisionStatus, setDecisionStatus] =
    useState<
      "idle" | "saving" | "saved" | "error"
    >("idle");

  const [decisionId, setDecisionId] =
    useState<number | null>(null);

  async function handleSave() {
    if (status === "saving" || status === "saved") {
      return;
    }

    setStatus("saving");

    try {
      const response = await fetch(
        "/api/admin/ai/recommendations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(recommendation),
        }
      );

      const data = (await response.json()) as {
        success?: boolean;
        recommendationId?: number;
        error?: string;
      };

      if (
        !response.ok ||
        !data.success ||
        typeof data.recommendationId !== "number"
      ) {
        throw new Error(
          data.error ?? "Unable to save recommendation."
        );
      }

      setRecommendationId(data.recommendationId);
      setStatus("saved");
    } catch (error) {
      console.error(
        "Failed to save recommendation:",
        error
      );

      setStatus("error");
    }
  }

  async function handleDecisionSave() {
    if (
      recommendationId === null ||
      selectedDecision === null ||
      decisionStatus === "saving" ||
      decisionStatus === "saved"
    ) {
      return;
    }

    setDecisionStatus("saving");

    try {
      const response = await fetch(
        "/api/admin/ai/decisions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recommendationId,
            decision: selectedDecision,
            notes,
          }),
        }
      );

      const data = (await response.json()) as {
        success?: boolean;
        decisionId?: number;
        recommendationId?: number;
        decision?: HumanDecision;
        error?: string;
      };

      if (
        !response.ok ||
        !data.success ||
        typeof data.decisionId !== "number"
      ) {
        throw new Error(
          data.error ??
            "Unable to save governance decision."
        );
      }

      setDecisionId(data.decisionId);
      setDecisionStatus("saved");
    } catch (error) {
      console.error(
        "Failed to save governance decision:",
        error
      );

      setDecisionStatus("error");
    }
  }

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          Recommendation Record
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Save the exact AI recommendation and evidence
          snapshot before making a human governance
          decision.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={
          status === "saving" || status === "saved"
        }
        className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "saving"
          ? "Saving..."
          : status === "saved"
            ? "Recommendation Saved"
            : "Save Recommendation"}
      </button>

      {status === "saved" &&
        recommendationId !== null && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">
              Recommendation #{recommendationId} saved.
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-700">
              This AI recommendation is now frozen as a
              permanent database record. Human governance
              decisions below will be linked to this exact
              recommendation.
            </p>
          </div>
        )}

      {status === "error" && (
        <p className="mt-3 text-sm font-semibold text-red-700">
          The recommendation could not be saved. Please
          try again.
        </p>
      )}

      {status === "saved" &&
        recommendationId !== null && (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Human Governance Decision
            </p>

            <h3 className="mt-2 text-lg font-bold text-slate-900">
              What should happen next?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your decision will be stored separately from
              the AI recommendation and linked to
              Recommendation #{recommendationId}.
            </p>

            <div className="mt-4 space-y-3">
              {decisionOptions.map((option) => {
                const selected =
                  selectedDecision === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={
                      decisionStatus === "saving" ||
                      decisionStatus === "saved"
                    }
                    onClick={() => {
                      setSelectedDecision(option.value);

                      if (
                        decisionStatus === "error"
                      ) {
                        setDecisionStatus("idle");
                      }
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <div className="font-bold text-slate-900">
                      {option.label}
                    </div>

                    <div className="mt-1 text-sm leading-6 text-slate-600">
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <label
                htmlFor="governance-notes"
                className="text-sm font-bold text-slate-700"
              >
                Decision Notes
              </label>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Optional. Record why you made this decision
                or what should be reconsidered later.
              </p>

              <textarea
                id="governance-notes"
                value={notes}
                disabled={
                  decisionStatus === "saving" ||
                  decisionStatus === "saved"
                }
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                rows={4}
                placeholder="Example: Continue collecting evidence for another reporting period before considering an experiment."
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
              />
            </div>

            <div className="mt-5 rounded-xl bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">
                Governance safeguard
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Recording a decision does not modify the
                website or authorize an automatic
                production deployment.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDecisionSave}
              disabled={
                selectedDecision === null ||
                decisionStatus === "saving" ||
                decisionStatus === "saved"
              }
              className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {decisionStatus === "saving"
                ? "Recording Decision..."
                : decisionStatus === "saved"
                  ? "Decision Recorded"
                  : "Record Governance Decision"}
            </button>

            {selectedDecision === null &&
              decisionStatus !== "saved" && (
                <p className="mt-2 text-xs text-slate-500">
                  Select a governance decision before
                  recording it.
                </p>
              )}

            {decisionStatus === "saved" &&
              decisionId !== null && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-bold text-emerald-800">
                    Human decision #{decisionId} recorded.
                  </p>

                  <p className="mt-1 text-sm leading-6 text-emerald-700">
                    This decision is permanently linked to
                    Recommendation #{recommendationId}.
                  </p>
                </div>
              )}

            {decisionStatus === "error" && (
              <p className="mt-3 text-sm font-semibold text-red-700">
                The governance decision could not be
                recorded. No decision has been confirmed.
                Please try again.
              </p>
            )}
          </div>
        )}
    </div>
  );
}