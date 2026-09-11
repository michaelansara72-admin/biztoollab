import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

type AnalyzeRequest = {
  tool: string;
  analysisType?: string;
  inputs?: Record<string, unknown>;
  results?: Record<string, unknown>;
};

const supportedTools = [
  "laundromat-profit",
  "vending-machine-profit",
  "car-wash-profit-roi",
];const rateLimitMap = new Map<string, number[]>();

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
    const scenarioInstructions =
  body.analysisType === "scenario-comparison"
    ? `
For scenario comparison analysis:

1. Compare the supplied Conservative, Expected, and Strong scenarios directly.
2. Focus on how changes in retail car volume affect revenue, profit, profit margin, and ROI.
3. Identify how resilient the business appears if retail traffic underperforms.
4. Point out the downside risk between the Expected and Conservative scenarios.
5. Identify whether retail traffic appears to be a major business sensitivity based only on the supplied scenario results.
6. Recommend one practical scenario the user should test next.
7. Do not invent new scenario results or calculate values that were not supplied.
8. Review the supplied sensitivity results for retail traffic, wash price, membership count, labor cost, and property cost.
9. Compare the profit and ROI impact of a 10% decrease and a 10% increase for each variable.
10. Identify which variable appears to have the greatest impact on business performance based only on the supplied sensitivity results.
11. Distinguish between revenue-side sensitivities and expense-side sensitivities.
12. Do not calculate new sensitivity values; interpret only the supplied sensitivity results.
13. Use the supplied sensitivityRanking as the source of truth for the order of business drivers.
14. Do not create a different ranking from your own interpretation.
15. When discussing the strongest and weakest drivers, reference the ranking supplied by the calculator.
16. Explain the ranking in plain English and connect the top-ranked drivers to the most useful scenario to test next.
17. Review the supplied combinedDownsideScenario as an already-calculated scenario.
18. Treat combinedDownsideScenario as the source of truth for the combined lower-traffic and lower-wash-price stress test.
19. Do not say that the combined downside scenario still needs to be calculated if combinedDownsideScenario is present.
20. Compare the combined downside result with the Expected and Conservative scenarios using only the supplied values.
21. Explain whether the business remains resilient under the combined downside case and identify the practical implication for the user.
22. Review the supplied combinedUpsideScenario as an already-calculated scenario.
23. Treat combinedUpsideScenario as the source of truth for the combined higher-traffic and higher-wash-price opportunity case.
24. Compare the combined upside result with the Expected and Strong scenarios using only the supplied values.
25. Explain how much additional upside exists when the two highest-ranked drivers improve together.
26. Do not imply that the combined upside result is guaranteed; describe it as an estimate based on the supplied assumptions.
`
    : "";

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
${scenarioInstructions}
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