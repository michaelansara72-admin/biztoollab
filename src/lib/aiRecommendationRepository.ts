import type { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";

export type AiRecommendationRecord = {
  source: string;
  siteUrl: string;
  evidenceStart: string;
  evidenceEnd: string;

  summary: string;
  evidenceAssessment: string;
  opportunity: string;
  evidence: string;
  recommendation: string;
  proposedExperiment: string;
  measurementPlan: string;

  confidence: "low" | "moderate" | "high";

  aiGovernanceStatus:
    | "monitor-longer"
    | "candidate-experiment";
};

export async function saveAiRecommendation(
  record: AiRecommendationRecord
) {
  const [result] = await db.execute<ResultSetHeader>(
    `
      INSERT INTO ai_recommendations (
        source,
        site_url,
        evidence_start,
        evidence_end,
        summary,
        evidence_assessment,
        opportunity,
        evidence,
        recommendation,
        proposed_experiment,
        measurement_plan,
        confidence,
        ai_governance_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.source,
      record.siteUrl,
      record.evidenceStart,
      record.evidenceEnd,
      record.summary,
      record.evidenceAssessment,
      record.opportunity,
      record.evidence,
      record.recommendation,
      record.proposedExperiment,
      record.measurementPlan,
      record.confidence,
      record.aiGovernanceStatus,
    ]
  );

  return {
    id: result.insertId,
  };
}