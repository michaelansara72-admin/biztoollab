import { useState } from "react";

export type AIAnalysis = {
  summary: string;
  strength: string;
  opportunity: string;
  risk: string;
  scenarioToTest: string;
  nextStep: string;
};

type AnalyzeOptions = {
  tool: string;
  analysisType?: string;
  inputs?: Record<string, unknown>;
  results: Record<string, unknown>;
};

export function useAIAnalysis() {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastAnalyzedSnapshot, setLastAnalyzedSnapshot] = useState("");
  const [cooldown, setCooldown] = useState(false);

  async function analyze({
    tool,
    analysisType = "business-opportunity",
    inputs = {},
    results,
  }: AnalyzeOptions) {
    const currentSnapshot = JSON.stringify({
      tool,
      analysisType,
      inputs,
      results,
    });

    if (currentSnapshot === lastAnalyzedSnapshot) {
      setError(
        "These results have already been analyzed. Change an input to generate a new AI analysis."
      );
      return;
    }

    try {
      setLoading(true);
      setCooldown(true);
      setError("");

      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool,
          analysisType,
          inputs,
          results,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to generate AI analysis.");
      }

      setAnalysis(data.analysis);
      setLastAnalyzedSnapshot(currentSnapshot);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to generate AI analysis."
      );
    } finally {
      setLoading(false);

      setTimeout(() => {
        setCooldown(false);
      }, 3000);
    }
  }

  return {
    analysis,
    loading,
    error,
    cooldown,
    analyze,
  };
}