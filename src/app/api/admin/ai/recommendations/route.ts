import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

import {
  saveAiRecommendation,
  type AiRecommendationRecord,
} from "@/lib/aiRecommendationRepository";

export const runtime = "nodejs";

type SaveRecommendationRequest = {
  source?: unknown;
  siteUrl?: unknown;
  period?: {
    startDate?: unknown;
    endDate?: unknown;
  };
  analysis?: {
    summary?: unknown;
    evidenceAssessment?: unknown;
    opportunity?: unknown;
    evidence?: unknown;
    recommendation?: unknown;
    experiment?: unknown;
    measurement?: unknown;
    confidence?: unknown;
    governanceStatus?: unknown;
  };
};

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isConfidence(
  value: unknown
): value is AiRecommendationRecord["confidence"] {
  return (
    value === "low" ||
    value === "moderate" ||
    value === "high"
  );
}

function isGovernanceStatus(
  value: unknown
): value is AiRecommendationRecord["aiGovernanceStatus"] {
  return (
    value === "monitor-longer" ||
    value === "candidate-experiment"
  );
}

export async function POST(request: Request) {
  const cookieStore = await cookies();

  const adminToken = cookieStore.get(
    adminSessionCookie.name
  )?.value;

  if (!verifyAdminSessionToken(adminToken)) {
    return NextResponse.json(
      {
        success: false,
        error: "Admin authentication required.",
      },
      {
        status: 401,
      }
    );
  }

  let body: SaveRecommendationRequest;

  try {
    body =
      (await request.json()) as SaveRecommendationRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON request body.",
      },
      {
        status: 400,
      }
    );
  }

  const analysis = body.analysis;
  const period = body.period;

  if (
    !isNonEmptyString(body.source) ||
    !isNonEmptyString(body.siteUrl) ||
    !isNonEmptyString(period?.startDate) ||
    !isNonEmptyString(period?.endDate) ||
    !isNonEmptyString(analysis?.summary) ||
    !isNonEmptyString(
      analysis?.evidenceAssessment
    ) ||
    !isNonEmptyString(analysis?.opportunity) ||
    !isNonEmptyString(analysis?.evidence) ||
    !isNonEmptyString(
      analysis?.recommendation
    ) ||
    !isNonEmptyString(analysis?.experiment) ||
    !isNonEmptyString(analysis?.measurement) ||
    !isConfidence(analysis?.confidence) ||
    !isGovernanceStatus(
      analysis?.governanceStatus
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Recommendation data is incomplete or invalid.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const result = await saveAiRecommendation({
      source: body.source,
      siteUrl: body.siteUrl,
      evidenceStart: period.startDate,
      evidenceEnd: period.endDate,

      summary: analysis.summary,
      evidenceAssessment:
        analysis.evidenceAssessment,
      opportunity: analysis.opportunity,
      evidence: analysis.evidence,
      recommendation: analysis.recommendation,
      proposedExperiment: analysis.experiment,
      measurementPlan: analysis.measurement,

      confidence: analysis.confidence,
      aiGovernanceStatus:
        analysis.governanceStatus,
    });

    return NextResponse.json(
      {
        success: true,
        recommendationId: result.id,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Failed to save AI recommendation:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to save the AI recommendation.",
      },
      {
        status: 500,
      }
    );
  }
}