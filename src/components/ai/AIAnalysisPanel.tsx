import AIInsight from "./AIInsight";

type AIAnalysis = {
  summary: string;
  strength: string;
  opportunity: string;
  risk: string;
  scenarioToTest: string;
  nextStep: string;
};

type AIAnalysisPanelProps = {
  analysis: AIAnalysis | null;
  loading: boolean;
  error: string;
  cooldown: boolean;
  onAnalyze: () => void;
};

export default function AIAnalysisPanel({
  analysis,
  loading,
  error,
  cooldown,
  onAnalyze,
}: AIAnalysisPanelProps) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">
        AI Business Analysis
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Get an AI-powered analysis of your current assumptions and estimated
        results.
      </p>

      <button
        type="button"
        onClick={onAnalyze}
        disabled={loading || cooldown}
        className="mt-5 w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Analyzing..."
          : cooldown
            ? "Please wait..."
            : "✨ Analyze My Results with AI"}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {analysis && (
        <div className="mt-6 space-y-4 border-t border-slate-200 pt-5">
          <AIInsight
            label="Analysis Summary"
            text={analysis.summary}
          />

          <AIInsight
            label="Business Strength"
            text={analysis.strength}
          />

          <AIInsight
            label="Opportunity"
            text={analysis.opportunity}
          />

          <AIInsight
            label="Potential Risk"
            text={analysis.risk}
          />

          <AIInsight
            label="Scenario to Test"
            text={analysis.scenarioToTest}
          />

          <AIInsight
            label="Recommended Next Step"
            text={analysis.nextStep}
          />

          <p className="pt-2 text-xs leading-5 text-slate-500">
            AI analysis is based on the assumptions and calculator results
            entered above. It is intended for planning and educational
            purposes and does not guarantee actual business performance.
          </p>
        </div>
      )}
    </div>
  );
}