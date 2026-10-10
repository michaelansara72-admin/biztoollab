import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getAnalysisProfile } from "@/lib/ai/analysisProfiles";
import {
  ANALYZE_OPENAI_TIMEOUT_MS,
  ANALYZE_RATE_LIMIT_MESSAGE,
  createAnalyzeRateLimiter,
  readBoundedJsonBody,
  resolveAnalyzeClientIdentity,
  type AnalyzeClientIdentity,
  type AnalyzeRateLimiter,
} from "@/lib/ai/analyzeRequestGuard";

type AnalyzeRequest = {
  tool: string;
  analysisType?: string;
  inputs?: Record<string, unknown>;
  results?: Record<string, unknown>;
};

type AnalyzeCompletion = {
  output_text: string;
};

export type AnalyzeDependencies = {
  apiKey?: string;
  now?: () => number;
  rateLimiter?: AnalyzeRateLimiter;
  resolveIdentity?: (headers: Headers) => AnalyzeClientIdentity;
  createResponse?: (
    body: Record<string, unknown>,
    options: {
      timeout: number;
      maxRetries: number;
    }
  ) => Promise<AnalyzeCompletion>;
};

const supportedTools = [
  "laundromat-profit",
  "vending-machine-profit",
  "car-wash-profit-roi",
];

const rateLimiter = createAnalyzeRateLimiter();

const openaiRequestOptions = {
  timeout: ANALYZE_OPENAI_TIMEOUT_MS,
  maxRetries: 0,
} as const;

function jsonError(error: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

function isAnalyzeRequest(value: unknown): value is AnalyzeRequest {
  return typeof value === "object" && value !== null;
}

export async function handleAnalyzeRequest(
  request: Request,
  dependencies: AnalyzeDependencies = {}
) {
  const limiter = dependencies.rateLimiter ?? rateLimiter;
  const now = dependencies.now?.() ?? Date.now();
  const identity = (
    dependencies.resolveIdentity ?? resolveAnalyzeClientIdentity
  )(request.headers);

  if (!limiter.check(identity, now).allowed) {
    return jsonError(ANALYZE_RATE_LIMIT_MESSAGE, 429);
  }

  const bodyResult = await readBoundedJsonBody(request);

  if (!bodyResult.ok) {
    return jsonError(bodyResult.error, bodyResult.status);
  }

  if (!isAnalyzeRequest(bodyResult.value)) {
    return jsonError("Unsupported or missing tool.", 400);
  }

  const body = bodyResult.value;

  if (!body.tool || !supportedTools.includes(body.tool)) {
    return jsonError("Unsupported or missing tool.", 400);
  }

  if (!body.results || Object.keys(body.results).length === 0) {
    return jsonError("Calculator results are required.", 400);
  }

  const apiKey =
    dependencies.apiKey ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return jsonError("OPENAI_API_KEY is not configured.", 500);
  }

  const analysisType =
    body.analysisType ?? "business-opportunity";

  const analysisProfile = getAnalysisProfile(analysisType);

  const completionBody = {
    model: "gpt-5.6-luna",

    store: false,

    reasoning: {
      effort: "none",
    },

    max_output_tokens: 1200,

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

${analysisProfile}
      `,

    input: `
Analyze the following BizToolLab calculator scenario.

Tool:
${body.tool}

Analysis type:
${analysisType}

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
  };

  try {
    const createResponse =
      dependencies.createResponse ??
      (async (payload, options) => {
        const openai = new OpenAI({
          apiKey,
          timeout: options.timeout,
          maxRetries: options.maxRetries,
        });

        const completion = await openai.responses.create(
          payload as Parameters<
            OpenAI["responses"]["create"]
          >[0],
          options
        );

        if (
          !completion ||
          typeof completion !== "object" ||
          !("output_text" in completion) ||
          typeof completion.output_text !== "string"
        ) {
          throw new Error("AI analysis response was empty.");
        }

        return {
          output_text: completion.output_text,
        };
      });

    const response = await createResponse(
      completionBody,
      openaiRequestOptions
    );

    if (
      !response ||
      typeof response.output_text !== "string"
    ) {
      throw new Error("AI analysis response was empty.");
    }

    const analysis = JSON.parse(response.output_text);

    return NextResponse.json({
      success: true,
      tool: body.tool,
      analysis,
    });
  } catch (error) {
    console.error(
      "BizToolLab AI analysis error:",
      error instanceof Error ? error.name : "unknown"
    );

    return jsonError("Unable to generate AI analysis.", 500);
  }
}
