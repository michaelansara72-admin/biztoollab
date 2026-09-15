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

type SaveRecommendationButtonProps = {
  recommendation: RecommendationPayload;
};

export default function SaveRecommendationButton({
  recommendation,
}: SaveRecommendationButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const [recommendationId, setRecommendationId] =
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

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <button
        type="button"
        onClick={handleSave}
        disabled={
          status === "saving" || status === "saved"
        }
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "saving"
          ? "Saving..."
          : status === "saved"
            ? "Recommendation Saved"
            : "Save Recommendation"}
      </button>

      {status === "saved" &&
        recommendationId !== null && (
          <p className="mt-2 text-sm font-semibold text-emerald-700">
            Saved as recommendation #
            {recommendationId}.
          </p>
        )}

      {status === "error" && (
        <p className="mt-2 text-sm font-semibold text-red-700">
          The recommendation could not be saved.
          Please try again.
        </p>
      )}
    </div>
  );
}