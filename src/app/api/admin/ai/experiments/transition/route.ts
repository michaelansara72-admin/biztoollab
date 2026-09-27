import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

import {
  getExperimentById,
  transitionExperimentStatus,
  type ExperimentStatus,
} from "@/lib/experimentRepository";

export const runtime = "nodejs";

type TransitionExperimentRequest = {
  experimentId?: unknown;
  nextStatus?: unknown;
};

const allowedRequestedStatuses:
  readonly ExperimentStatus[] = [
    "ready-for-review",
    "approved",
    "rejected",
  ];

function isPositiveSafeInteger(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function isExperimentStatus(
  value: unknown
): value is ExperimentStatus {
  return (
    typeof value === "string" &&
    allowedRequestedStatuses.includes(
      value as ExperimentStatus
    )
  );
}

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
          error: "Admin authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as TransitionExperimentRequest;

    if (!isPositiveSafeInteger(body.experimentId)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid experiment ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isExperimentStatus(body.nextStatus)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid experiment status transition is required.",
        },
        {
          status: 400,
        }
      );
    }

    const experiment =
      await getExperimentById(
        body.experimentId
      );

    if (!experiment) {
      return NextResponse.json(
        {
          success: false,
          error: "Experiment not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (experiment.status === body.nextStatus) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Experiment #${experiment.id} is already ${body.nextStatus}.`,
        },
        {
          status: 409,
        }
      );
    }

    const validTransition =
      (
        experiment.status === "draft" &&
        body.nextStatus ===
          "ready-for-review"
      ) ||
      (
        experiment.status ===
          "ready-for-review" &&
        (
          body.nextStatus === "approved" ||
          body.nextStatus === "rejected"
        )
      );

    if (!validTransition) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Invalid experiment status transition: ${experiment.status} -> ${body.nextStatus}.`,
        },
        {
          status: 409,
        }
      );
    }

    const transition =
      await transitionExperimentStatus({
        experimentId: experiment.id,
        nextStatus: body.nextStatus,
      });

    const updatedExperiment =
      await getExperimentById(
        experiment.id
      );

    if (!updatedExperiment) {
      throw new Error(
        "Experiment transitioned but could not be retrieved."
      );
    }

    return NextResponse.json({
      success: true,

      transition: {
        experimentId:
          transition.experimentId,

        previousStatus:
          transition.previousStatus,

        status:
          transition.status,
      },

      experiment: {
        id: updatedExperiment.id,

        recommendationId:
          updatedExperiment.recommendation_id,

        sourceDecisionId:
          updatedExperiment.source_decision_id,

        title:
          updatedExperiment.title,

        status:
          updatedExperiment.status,

        updatedAt:
          updatedExperiment.updated_at,
      },

      governance: {
        productionAuthorized: false,
        message:
          "This lifecycle transition does not authorize automatic production implementation.",
      },
    });
  } catch (error) {
    console.error(
      "Failed to transition governed experiment:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "The experiment status transition could not be completed.",
      },
      {
        status: 500,
      }
    );
  }
}
