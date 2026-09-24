import OpenAI from "openai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

import {
  getGoogleAccessToken,
  getSearchConsoleSiteUrl,
  querySearchConsole,
  type SearchConsoleRow,
} from "@/lib/googleSearchConsole";

import {
  getSnapshotByPeriod,
  saveSearchConsoleSnapshot,
  type SavedSearchConsoleSnapshot,
} from "@/lib/searchConsoleSnapshotRepository";

import {
  seoOpportunityProfile,
} from "@/lib/ai/seoOpportunityProfile";

import {
  createSeoEvidenceFingerprint,
  serializeSeoEvidence,
  type SeoEvidence,
  type SeoEvidencePage,
  type SeoEvidenceQuery,
} from "@/lib/seoEvidence";

export const runtime = "nodejs";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeStoredDate(
  value: Date | string
): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function parseStoredArray(
  value: string | object | null,
  label: string
): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed;
    }
  }

  throw new Error(
    `Stored Search Console ${label} evidence is invalid.`
  );
}

function requireFiniteNumber(
  value: unknown,
  label: string
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `Stored Search Console ${label} must be a finite number.`
    );
  }

  return value;
}

function parseStoredQueries(
  value: string | object | null
): SeoEvidenceQuery[] {
  const rows = parseStoredArray(value, "query");

  return rows.map((row, index) => {
    if (
      typeof row !== "object" ||
      row === null ||
      Array.isArray(row)
    ) {
      throw new Error(
        `Stored Search Console query row ${index} is invalid.`
      );
    }

    const candidate = row as Record<
      string,
      unknown
    >;

    if (typeof candidate.query !== "string") {
      throw new Error(
        `Stored Search Console query row ${index} has an invalid query.`
      );
    }

    return {
      query: candidate.query,
      clicks: requireFiniteNumber(
        candidate.clicks,
        `query row ${index} clicks`
      ),
      impressions: requireFiniteNumber(
        candidate.impressions,
        `query row ${index} impressions`
      ),
      ctr: requireFiniteNumber(
        candidate.ctr,
        `query row ${index} ctr`
      ),
      position: requireFiniteNumber(
        candidate.position,
        `query row ${index} position`
      ),
    };
  });
}

function parseStoredPages(
  value: string | object | null
): SeoEvidencePage[] {
  const rows = parseStoredArray(value, "page");

  return rows.map((row, index) => {
    if (
      typeof row !== "object" ||
      row === null ||
      Array.isArray(row)
    ) {
      throw new Error(
        `Stored Search Console page row ${index} is invalid.`
      );
    }

    const candidate = row as Record<
      string,
      unknown
    >;

    if (typeof candidate.page !== "string") {
      throw new Error(
        `Stored Search Console page row ${index} has an invalid page.`
      );
    }

    return {
      page: candidate.page,
      clicks: requireFiniteNumber(
        candidate.clicks,
        `page row ${index} clicks`
      ),
      impressions: requireFiniteNumber(
        candidate.impressions,
        `page row ${index} impressions`
      ),
      ctr: requireFiniteNumber(
        candidate.ctr,
        `page row ${index} ctr`
      ),
      position: requireFiniteNumber(
        candidate.position,
        `page row ${index} position`
      ),
    };
  });
}

function createEvidenceFromSnapshot(
  snapshot: SavedSearchConsoleSnapshot
): SeoEvidence {
  return {
    siteUrl: snapshot.site_url,

    period: {
      startDate: normalizeStoredDate(
        snapshot.evidence_start
      ),
      endDate: normalizeStoredDate(
        snapshot.evidence_end
      ),
    },

    metrics: {
      clicks: requireFiniteNumber(
        snapshot.clicks,
        "clicks"
      ),
      impressions: requireFiniteNumber(
        snapshot.impressions,
        "impressions"
      ),
      ctr: requireFiniteNumber(
        snapshot.ctr,
        "ctr"
      ),
      position: requireFiniteNumber(
        snapshot.position,
        "position"
      ),
    },

    queries: parseStoredQueries(
      snapshot.queries_json
    ),

    pages: parseStoredPages(
      snapshot.pages_json
    ),
  };
}

export async function GET() {
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

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "OPENAI_API_KEY is not configured.",
      },
      {
        status: 500,
      }
    );
  }

  const endDateObject = new Date();
  endDateObject.setDate(
    endDateObject.getDate() - 1
  );

  const startDateObject = new Date(
    endDateObject
  );

  startDateObject.setDate(
    startDateObject.getDate() - 27
  );

  const startDate = formatDate(startDateObject);
  const endDate = formatDate(endDateObject);

  const siteUrl = getSearchConsoleSiteUrl();

  try {
    let snapshot = await getSnapshotByPeriod({
      siteUrl,
      evidenceStart: startDate,
      evidenceEnd: endDate,
    });

    let evidence: SeoEvidence;

    if (snapshot) {
      evidence =
        createEvidenceFromSnapshot(snapshot);
    } else {
      const googleAccessToken =
        await getGoogleAccessToken();

      const [
        totalsData,
        queriesData,
        pagesData,
      ] = await Promise.all([
        querySearchConsole(
          googleAccessToken,
          startDate,
          endDate
        ),

        querySearchConsole(
          googleAccessToken,
          startDate,
          endDate,
          ["query"],
          1000
        ),

        querySearchConsole(
          googleAccessToken,
          startDate,
          endDate,
          ["page"],
          1000
        ),
      ]);

      const totals: SearchConsoleRow =
        totalsData.rows?.[0] ?? {
          clicks: 0,
          impressions: 0,
          ctr: 0,
          position: 0,
        };

      const queries: SeoEvidenceQuery[] =
        queriesData.rows?.map(
          (row: SearchConsoleRow) => ({
            query: row.keys?.[0] ?? "",
            clicks: row.clicks ?? 0,
            impressions:
              row.impressions ?? 0,
            ctr: row.ctr ?? 0,
            position: row.position ?? 0,
          })
        ) ?? [];

      const pages: SeoEvidencePage[] =
        pagesData.rows?.map(
          (row: SearchConsoleRow) => ({
            page: row.keys?.[0] ?? "",
            clicks: row.clicks ?? 0,
            impressions:
              row.impressions ?? 0,
            ctr: row.ctr ?? 0,
            position: row.position ?? 0,
          })
        ) ?? [];

      evidence = {
        siteUrl,

        period: {
          startDate,
          endDate,
        },

        metrics: {
          clicks: totals.clicks ?? 0,
          impressions:
            totals.impressions ?? 0,
          ctr: totals.ctr ?? 0,
          position: totals.position ?? 0,
        },

        queries,
        pages,
      };

      const result =
        await saveSearchConsoleSnapshot({
          siteUrl,

          evidenceStart: startDate,
          evidenceEnd: endDate,

          clicks: evidence.metrics.clicks,
          impressions:
            evidence.metrics.impressions,
          ctr: evidence.metrics.ctr,
          position:
            evidence.metrics.position,

          queries: evidence.queries,
          pages: evidence.pages,
        });

      snapshot = await getSnapshotByPeriod({
        siteUrl,
        evidenceStart: startDate,
        evidenceEnd: endDate,
      });

      if (
        !snapshot ||
        snapshot.id !== result.id
      ) {
        throw new Error(
          "Saved Search Console snapshot could not be verified."
        );
      }
    }

    const serializedEvidence =
      serializeSeoEvidence(evidence);

    const evidenceFingerprint =
      createSeoEvidenceFingerprint(evidence);

    const openai = new OpenAI({
      apiKey,
    });

    const response =
      await openai.responses.create({
        model: "gpt-5.6-luna",

        store: false,

        reasoning: {
          effort: "none",
        },

        max_output_tokens: 1800,

        instructions: seoOpportunityProfile,

        input: `
Analyze the following saved Google Search Console evidence
for BizToolLab.

${serializedEvidence}
        `,

        text: {
          format: {
            type: "json_schema",
            name: "biztoollab_seo_opportunity",
            strict: true,

            schema: {
              type: "object",

              properties: {
                summary: {
                  type: "string",
                },

                evidenceAssessment: {
                  type: "string",
                },

                opportunity: {
                  type: "string",
                },

                evidence: {
                  type: "string",
                },

                recommendation: {
                  type: "string",
                },

                experiment: {
                  type: "string",
                },

                measurement: {
                  type: "string",
                },

                confidence: {
                  type: "string",
                  enum: [
                    "low",
                    "moderate",
                    "high",
                  ],
                },

                governanceStatus: {
                  type: "string",
                  enum: [
                    "monitor-longer",
                    "candidate-experiment",
                  ],
                },
              },

              required: [
                "summary",
                "evidenceAssessment",
                "opportunity",
                "evidence",
                "recommendation",
                "experiment",
                "measurement",
                "confidence",
                "governanceStatus",
              ],

              additionalProperties: false,
            },
          },
        },
      });

    const analysis = JSON.parse(
      response.output_text
    );

    return NextResponse.json({
      success: true,
      source: "google-search-console",
      siteUrl,

      snapshotId: snapshot.id,

      period: {
        startDate,
        endDate,
      },

      analysis,
      evidenceFingerprint,
    });
  } catch (error) {
    console.error(
      "BizToolLab SEO opportunity error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to generate SEO opportunity intelligence.",
      },
      {
        status: 500,
      }
    );
  }
}