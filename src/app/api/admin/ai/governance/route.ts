import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

import {
  getAiRecommendationById,
  getLatestAiRecommendation,
} from "@/lib/aiRecommendationRepository";

import {
  getDecisionsForRecommendation,
} from "@/lib/humanDecisionRepository";

export const runtime = "nodejs";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const idParameter = url.searchParams.get("id");

  let recommendationId: number | null = null;

  if (idParameter !== null) {
    if (!/^[1-9]\d*$/.test(idParameter)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid recommendation ID.",
        },
        {
          status: 400,
        }
      );
    }

    recommendationId = Number(idParameter);

    if (!Number.isSafeInteger(recommendationId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid recommendation ID.",
        },
        {
          status: 400,
        }
      );
    }
  }

  try {
    const recommendation =
      recommendationId === null
        ? await getLatestAiRecommendation()
        : await getAiRecommendationById(
            recommendationId
          );

    if (!recommendation) {
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

    const decisions =
      await getDecisionsForRecommendation(
        recommendation.id
      );

    return NextResponse.json(
      {
        success: true,
        recommendation,
        latestDecision: decisions[0] ?? null,
        decisions,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Failed to retrieve governance history:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to retrieve governance history.",
      },
      {
        status: 500,
      }
    );
  }
}