import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

import {
  recommendationExists,
  saveHumanDecision,
  type HumanDecision,
} from "@/lib/humanDecisionRepository";

export const runtime = "nodejs";

const allowedDecisions: HumanDecision[] = [
  "review-experiment",
  "monitor-longer",
  "modify",
  "reject",
];

type DecisionRequest = {
  recommendationId?: number;
  decision?: HumanDecision;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const adminToken = cookieStore.get(
      adminSessionCookie.name
    )?.value;

    if (!verifyAdminSessionToken(adminToken)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const body = (await request.json()) as DecisionRequest;

    const recommendationId = Number(
      body.recommendationId
    );

    if (
      !Number.isInteger(recommendationId) ||
      recommendationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid recommendation ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.decision ||
      !allowedDecisions.includes(body.decision)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid human decision is required.",
        },
        {
          status: 400,
        }
      );
    }

    const exists = await recommendationExists(
      recommendationId
    );

    if (!exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Recommendation not found.",
        },
        {
          status: 404,
        }
      );
    }

    const result = await saveHumanDecision({
      recommendationId,
      decision: body.decision,
      notes: body.notes,
      decidedBy: "admin",
    });

    return NextResponse.json(
      {
        success: true,
        decisionId: result.id,
        recommendationId: result.recommendationId,
        decision: result.decision,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Failed to save human governance decision:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "The human governance decision could not be saved.",
      },
      {
        status: 500,
      }
    );
  }
}