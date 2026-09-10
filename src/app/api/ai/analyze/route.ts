import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

type AnalyzeRequest = {
  tool: string;
  analysisType?: string;
  inputs?: Record<string, unknown>;
  results?: Record<string, unknown>;
};

const supportedTools = ["laundromat-profit"];
const rateLimitMap = new Map<string, number[]>();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
export async function POST(request: NextRequest) {
  try {const forwardedFor = request.headers.get("x-forwarded-for");
const clientIp =
  forwardedFor?.split(",")[0]?.trim() ||
  request.headers.get("x-real-ip") ||
  "unknown";

const now = Date.now();

const recentRequests = (rateLimitMap.get(clientIp) || []).filter(
  (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
);

if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
  return NextResponse.json(
    {
      success: false,
      error: "Too many AI requests. Please wait a moment and try again.",
    },
    { status: 429 }
  );
}

recentRequests.push(now);
rateLimitMap.set(clientIp, recentRequests);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "OPENAI_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as AnalyzeRequest;

    if (!body.tool || !supportedTools.includes(body.tool)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported or missing tool.",
        },
        { status: 400 }
      );
    }

    if (!body.results || Object.keys(body.results).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Calculator results are required.",
        },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      store: false,
      reasoning: {
        effort: "none",
      },
      max_output_tokens: 700,
      instructions: `
You are BizToolLab AI, a business decision-support assistant.

Follow these rules:

1. Never recalculate or replace the calculator's math.
2. Treat the supplied calculator results as the source of truth.
3. Explain the numbers in plain English.
4. Identify useful opportunities, risks, sensitivities, and scenarios.
5. Do not invent market averages, benchmarks, statistics, regulations,
   rates, prices, or other facts that were not supplied.
6. Do not imply that estimated results guarantee actual business performance.
7. Do not provide legal, tax, accounting, or investment advice.
8. If important information is missing, explain the limitation instead of guessing.
9. Keep recommendations practical and concise.
10. Prioritize observations that help the user make a better business decision.
      `,
      input: `
Analyze the following BizToolLab calculator scenario.

Tool:
${body.tool}

Analysis type:
${body.analysisType ?? "business-opportunity"}

User inputs:
${JSON.stringify(body.inputs ?? {}, null, 2)}

Calculator results:
${JSON.stringify(body.results, null, 2)}
      `,
      text: {
        format: {
          type: "json_schema",
          name: "biztoollab_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: {
                type: "string",
              },
              strength: {
                type: "string",
              },
              opportunity: {
                type: "string",
              },
              risk: {
                type: "string",
              },
              scenarioToTest: {
                type: "string",
              },
              nextStep: {
                type: "string",
              },
            },
            required: [
              "summary",
              "strength",
              "opportunity",
              "risk",
              "scenarioToTest",
              "nextStep",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const analysis = JSON.parse(response.output_text);

    return NextResponse.json({
      success: true,
      tool: body.tool,
      analysis,
    });
  } catch (error) {
    console.error("BizToolLab AI analysis error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to generate AI analysis.",
      },
      { status: 500 }
    );
  }
}