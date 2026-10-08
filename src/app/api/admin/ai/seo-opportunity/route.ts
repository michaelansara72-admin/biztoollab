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
} from "@/lib/googleSearchConsole";

import {
  getSnapshotByPeriod,
  saveSearchConsoleSnapshot,
} from "@/lib/searchConsoleSnapshotRepository";

import {
  seoOpportunityProfile,
} from "@/lib/ai/seoOpportunityProfile";

import {
  resolveAdminSeoOpportunityEvidence,
  seoOpportunityEvidencePrompt,
} from "@/lib/seoOpportunityEvidence";

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

  const siteUrl = getSearchConsoleSiteUrl();

  try {
    const resolution = await resolveAdminSeoOpportunityEvidence({
      siteUrl,
      startDate,
      endDate,
      loadExistingSnapshot: () =>
        getSnapshotByPeriod({
          siteUrl,
          evidenceStart: startDate,
          evidenceEnd: endDate,
        }),
      getAccessToken: getGoogleAccessToken,
      querySearchConsole,
      saveSnapshot: saveSearchConsoleSnapshot,
      reloadSnapshot: getSnapshotByPeriod,
    });

    const serializedEvidence = seoOpportunityEvidencePrompt(
      resolution.evidence
    );

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
      siteUrl: resolution.evidence.siteUrl,

      snapshotId: resolution.snapshot.id,

      period: {
        startDate: resolution.evidence.period.startDate,
        endDate: resolution.evidence.period.endDate,
      },

      analysis,
      evidenceFingerprint: resolution.evidenceFingerprint,
      evidenceState: resolution.evidenceState,
      collectedAt: resolution.collectedAt,
      evidenceCoverage: resolution.evidenceCoverage,
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