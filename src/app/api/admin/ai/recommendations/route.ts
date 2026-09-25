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

import {
  saveRecommendationSnapshotLink,
} from "@/lib/recommendationSnapshotRepository";

import {
  getSearchConsoleSnapshotById,
  type SavedSearchConsoleSnapshot,
} from "@/lib/searchConsoleSnapshotRepository";

import {
  createSeoEvidenceFingerprint,
  type SeoEvidence,
  type SeoEvidencePage,
  type SeoEvidenceQuery,
} from "@/lib/seoEvidence";

import { db } from "@/lib/db";

export const runtime = "nodejs";

type SaveRecommendationRequest = {
  source?: unknown;
  siteUrl?: unknown;
  snapshotId?: unknown;
  evidenceFingerprint?: unknown;

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

function isPositiveSafeInteger(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function isEvidenceFingerprint(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{64}$/.test(value)
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

function formatDatabaseDate(
  value: Date | string
): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function parseJsonArray(
  value: string | object | null
): unknown[] {
  if (value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      throw new Error(
        "Snapshot JSON evidence must contain an array."
      );
    }

    return parsed;
  }

  throw new Error(
    "Snapshot JSON evidence has an invalid structure."
  );
}

function isEvidenceQuery(
  value: unknown
): value is SeoEvidenceQuery {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.query === "string" &&
    Number.isFinite(Number(row.clicks)) &&
    Number.isFinite(Number(row.impressions)) &&
    Number.isFinite(Number(row.ctr)) &&
    Number.isFinite(Number(row.position))
  );
}

function isEvidencePage(
  value: unknown
): value is SeoEvidencePage {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.page === "string" &&
    Number.isFinite(Number(row.clicks)) &&
    Number.isFinite(Number(row.impressions)) &&
    Number.isFinite(Number(row.ctr)) &&
    Number.isFinite(Number(row.position))
  );
}

function normalizeQueries(
  values: unknown[]
): SeoEvidenceQuery[] {
  return values.map((value) => {
    if (!isEvidenceQuery(value)) {
      throw new Error(
        "Stored Search Console query evidence is invalid."
      );
    }

    return {
      query: value.query,
      clicks: Number(value.clicks),
      impressions: Number(value.impressions),
      ctr: Number(value.ctr),
      position: Number(value.position),
    };
  });
}

function normalizePages(
  values: unknown[]
): SeoEvidencePage[] {
  return values.map((value) => {
    if (!isEvidencePage(value)) {
      throw new Error(
        "Stored Search Console page evidence is invalid."
      );
    }

    return {
      page: value.page,
      clicks: Number(value.clicks),
      impressions: Number(value.impressions),
      ctr: Number(value.ctr),
      position: Number(value.position),
    };
  });
}

function createEvidenceFromSnapshot(
  snapshot: SavedSearchConsoleSnapshot
): SeoEvidence {
  const queries = normalizeQueries(
    parseJsonArray(snapshot.queries_json)
  );

  const pages = normalizePages(
    parseJsonArray(snapshot.pages_json)
  );

  const clicks = Number(snapshot.clicks);
  const impressions = Number(snapshot.impressions);
  const ctr = Number(snapshot.ctr);
  const position = Number(snapshot.position);

  if (
    !Number.isFinite(clicks) ||
    !Number.isFinite(impressions) ||
    !Number.isFinite(ctr) ||
    !Number.isFinite(position)
  ) {
    throw new Error(
      "Stored Search Console snapshot metrics are invalid."
    );
  }

  return {
    siteUrl: snapshot.site_url,

    period: {
      startDate: formatDatabaseDate(
        snapshot.evidence_start
      ),
      endDate: formatDatabaseDate(
        snapshot.evidence_end
      ),
    },

    metrics: {
      clicks,
      impressions,
      ctr,
      position,
    },

    queries,
    pages,
  };
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
    !isPositiveSafeInteger(body.snapshotId) ||
    !isEvidenceFingerprint(
      body.evidenceFingerprint
    ) ||
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
    const snapshot =
      await getSearchConsoleSnapshotById(
        body.snapshotId
      );

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The referenced Search Console snapshot does not exist.",
        },
        {
          status: 409,
        }
      );
    }

    const snapshotEvidence =
      createEvidenceFromSnapshot(snapshot);

    if (
      snapshotEvidence.siteUrl !== body.siteUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The recommendation site does not match the referenced evidence snapshot.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      snapshotEvidence.period.startDate !==
        period.startDate ||
      snapshotEvidence.period.endDate !==
        period.endDate
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The recommendation evidence period does not match the referenced snapshot.",
        },
        {
          status: 409,
        }
      );
    }

    const calculatedFingerprint =
      createSeoEvidenceFingerprint(
        snapshotEvidence
      );

    if (
      calculatedFingerprint !==
      body.evidenceFingerprint
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Evidence fingerprint verification failed. The recommendation was not saved.",
        },
        {
          status: 409,
        }
      );
    }

    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      const result =
        await saveAiRecommendation(
          {
            source: body.source,
            siteUrl: body.siteUrl,
            evidenceStart:
              snapshotEvidence.period.startDate,
            evidenceEnd:
              snapshotEvidence.period.endDate,
            evidenceFingerprint:
              calculatedFingerprint,

            summary: analysis.summary,
            evidenceAssessment:
              analysis.evidenceAssessment,
            opportunity: analysis.opportunity,
            evidence: analysis.evidence,
            recommendation:
              analysis.recommendation,
            proposedExperiment:
              analysis.experiment,
            measurementPlan:
              analysis.measurement,

            confidence: analysis.confidence,
            aiGovernanceStatus:
              analysis.governanceStatus,
          },
          connection
        );

      const snapshotLink =
        await saveRecommendationSnapshotLink(
          {
            recommendationId: result.id,
            snapshotId: snapshot.id,
            relationshipType:
              "analysis-time",
            notes:
              "Verified evidence snapshot used when this AI recommendation was generated.",
          },
          connection
        );

      await connection.commit();

      return NextResponse.json(
        {
          success: true,
          recommendationId: result.id,
          snapshotId: snapshot.id,
          snapshotLinkId: snapshotLink.id,
          evidenceFingerprint:
            calculatedFingerprint,
          evidenceVerified: true,
        },
        {
          status: 201,
        }
      );
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Failed to roll back AI recommendation transaction:",
          rollbackError
        );
      }

      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(
      "Failed to save verified AI recommendation:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to save the verified AI recommendation.",
      },
      {
        status: 500,
      }
    );
  }
}