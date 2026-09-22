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
  seoOpportunityProfile,
} from "@/lib/ai/seoOpportunityProfile";

import {
  createSeoEvidenceFingerprint,
  serializeSeoEvidence,
  type SeoEvidence,
} from "@/lib/seoEvidence";
export const runtime = "nodejs";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
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

  try {
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
        ["query"]
      ),
      querySearchConsole(
        googleAccessToken,
        startDate,
        endDate,
        ["page"]
      ),
    ]);

    const totals: SearchConsoleRow =
      totalsData.rows?.[0] ?? {
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
      };

    const queries =
      queriesData.rows?.map(
        (row: SearchConsoleRow) => ({
          query: row.keys?.[0] ?? "",
          clicks: row.clicks ?? 0,
          impressions: row.impressions ?? 0,
          ctr: row.ctr ?? 0,
          position: row.position ?? 0,
        })
      ) ?? [];

    const pages =
      pagesData.rows?.map(
        (row: SearchConsoleRow) => ({
          page: row.keys?.[0] ?? "",
          clicks: row.clicks ?? 0,
          impressions: row.impressions ?? 0,
          ctr: row.ctr ?? 0,
          position: row.position ?? 0,
        })
      ) ?? [];

    const evidence: SeoEvidence = {
      siteUrl: getSearchConsoleSiteUrl(),

      period: {
        startDate,
        endDate,
      },

      metrics: {
        clicks: totals.clicks ?? 0,
        impressions: totals.impressions ?? 0,
        ctr: totals.ctr ?? 0,
        position: totals.position ?? 0,
      },

      queries,
      pages,
    };

    const serializedEvidence = serializeSeoEvidence(evidence);
    const evidenceFingerprint = createSeoEvidenceFingerprint(evidence);
    const openai = new OpenAI({
      apiKey,
    });

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",

      store: false,

      reasoning: {
        effort: "none",
      },

      max_output_tokens: 1800,

      instructions: seoOpportunityProfile,

      input: `
Analyze the following live Google Search Console evidence
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
      siteUrl: getSearchConsoleSiteUrl(),

      period: {
        startDate,
        endDate,
      },

      analysis,
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