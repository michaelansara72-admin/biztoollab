import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";
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

export type SavedAiRecommendation =
  RowDataPacket & {
    id: number;
    source: string;
    site_url: string;
    evidence_start: Date | string;
    evidence_end: Date | string;

    summary: string;
    evidence_assessment: string;
    opportunity: string;
    evidence: string;
    recommendation: string;
    proposed_experiment: string;
    measurement_plan: string;

    confidence: "low" | "moderate" | "high";

    ai_governance_status:
      | "monitor-longer"
      | "candidate-experiment";

    created_at: Date;
    updated_at: Date;
  };

export async function getAiRecommendationById(
  recommendationId: number
): Promise<SavedAiRecommendation | null> {
  const [rows] = await db.execute<
    SavedAiRecommendation[]
  >(
    `
      SELECT *
      FROM ai_recommendations
      WHERE id = ?
      LIMIT 1
    `,
    [recommendationId]
  );

  return rows[0] ?? null;
}

export async function getLatestAiRecommendation():
  Promise<SavedAiRecommendation | null> {
  const [rows] = await db.execute<
    SavedAiRecommendation[]
  >(
    `
      SELECT *
      FROM ai_recommendations
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `
  );

  return rows[0] ?? null;
}