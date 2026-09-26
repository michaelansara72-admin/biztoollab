"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type HumanDecision =
  | "review-experiment"
  | "monitor-longer"
  | "modify"
  | "reject";

type Props = {
  recommendationId: number;
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
      "Advance this recommendation into controlled experiment planning. This does not authorize a production change.",
  },
  {
    value: "monitor-longer",
    label: "Monitor Longer",
    description:
      "Keep collecting evidence before advancing the recommendation.",
  },
  {
    value: "modify",
    label: "Modify",
    description:
      "Keep the recommendation under consideration, but revise the proposed approach.",
  },
  {
    value: "reject",
    label: "Reject",
    description:
      "Do not pursue this recommendation in its current form.",
  },
];

export default function SavedGovernanceDecisionControls({
  recommendationId,
}: Props) {
  const router = useRouter();

  const [selectedDecision, setSelectedDecision] =
    useState<HumanDecision | null>(null);

  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const [decisionId, setDecisionId] =
    useState<number | null>(null);

  async function handleSave() {
    if (
      selectedDecision === null ||
      status === "saving" ||
      status === "saved"
    ) {
      return;
    }

    setStatus("saving");

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
      setStatus("saved");

      router.refresh();
    } catch (error) {
      console.error(
        "Failed to save governance decision:",
        error
      );

      setStatus("error");
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
        Human Governance Decision
      </p>

      <h3 className="mt-2 text-xl font-bold text-slate-900">
        What should happen next?
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Record your decision for Recommendation #
        {recommendationId}. The decision is stored separately
        from the AI recommendation and permanently linked to
        it.
      </p>

      <div className="mt-5 space-y-3">
        {decisionOptions.map((option) => {
          const selected =
            selectedDecision === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={
                status === "saving" ||
                status === "saved"
              }
              onClick={() => {
                setSelectedDecision(option.value);

                if (status === "error") {
                  setStatus("idle");
                }
              }}
              className={`w-full rounded-xl border p-4 text-left transition ${
                selected
                  ? "border-slate-900 bg-white"
                  : "border-blue-200 bg-white hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className="font-bold text-slate-900">
                {option.label}
              </div>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <label
          htmlFor={`saved-governance-notes-${recommendationId}`}
          className="text-sm font-bold text-slate-700"
        >
          Decision Notes
        </label>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Optional. Record why you made this decision or what
          should happen next.
        </p>

        <textarea
          id={`saved-governance-notes-${recommendationId}`}
          value={notes}
          disabled={
            status === "saving" ||
            status === "saved"
          }
          onChange={(event) =>
            setNotes(event.target.value)
          }
          rows={4}
          className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
          placeholder="Example: Advance this recommendation into controlled experiment planning only. No production change is authorized."
        />
      </div>

      <div className="mt-5 rounded-xl bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-900">
          Governance safeguard
        </p>

        <p className="mt-1 text-sm leading-6 text-amber-800">
          Recording this decision does not modify the website,
          launch an experiment, or authorize an automatic
          production deployment.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={
          selectedDecision === null ||
          status === "saving" ||
          status === "saved"
        }
        className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "saving"
          ? "Recording Decision..."
          : status === "saved"
            ? "Decision Recorded"
            : "Record Governance Decision"}
      </button>

      {status === "saved" &&
        decisionId !== null && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-800">
              Human decision #{decisionId} recorded.
            </p>
          </div>
        )}

      {status === "error" && (
        <p className="mt-4 font-semibold text-red-700">
          The governance decision could not be recorded.
          No decision has been confirmed.
        </p>
      )}
    </div>
  );
}