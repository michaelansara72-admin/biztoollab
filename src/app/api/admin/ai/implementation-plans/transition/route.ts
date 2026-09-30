import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

import {
  canTransitionImplementationPlanStatus,
  getImplementationPlanById,
  transitionImplementationPlanStatus,
  type ImplementationPlanStatus,
} from "@/lib/implementationPlanRepository";

export const runtime = "nodejs";

type TransitionImplementationPlanRequest = {
  implementationPlanId?: unknown;
  nextStatus?: unknown;
};

const allowedRequestedStatuses:
  readonly ImplementationPlanStatus[] = [
    "ready-for-review",
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

function isImplementationPlanStatus(
  value: unknown
): value is ImplementationPlanStatus {
  return (
    typeof value === "string" &&
    allowedRequestedStatuses.includes(
      value as ImplementationPlanStatus
    )
  );
}

function isProductionAuthorized(
  value: unknown
) {
  return Boolean(value);
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
      (await request.json()) as TransitionImplementationPlanRequest;

    if (
      !isPositiveSafeInteger(
        body.implementationPlanId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid implementation plan ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isImplementationPlanStatus(body.nextStatus)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid implementation plan status transition is required.",
        },
        {
          status: 400,
        }
      );
    }

    const implementationPlan =
      await getImplementationPlanById(
        body.implementationPlanId
      );

    if (!implementationPlan) {
      return NextResponse.json(
        {
          success: false,
          error: "Implementation plan not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      isProductionAuthorized(
        implementationPlan.production_authorized
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "An implementation plan with production authorization cannot be transitioned by this review action.",
        },
        {
          status: 409,
        }
      );
    }

    if (implementationPlan.status === body.nextStatus) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Implementation plan #${implementationPlan.id} is already ${body.nextStatus}.`,
        },
        {
          status: 409,
        }
      );
    }

    if (
      !canTransitionImplementationPlanStatus(
        implementationPlan.status,
        body.nextStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Invalid implementation plan status transition: ${implementationPlan.status} -> ${body.nextStatus}.`,
        },
        {
          status: 409,
        }
      );
    }

    const transition =
      await transitionImplementationPlanStatus({
        implementationPlanId:
          implementationPlan.id,
        nextStatus: body.nextStatus,
      });

    const updatedImplementationPlan =
      await getImplementationPlanById(
        implementationPlan.id
      );

    if (!updatedImplementationPlan) {
      throw new Error(
        "Implementation plan transitioned but could not be retrieved."
      );
    }

    return NextResponse.json({
      success: true,

      transition: {
        implementationPlanId:
          transition.implementationPlanId,

        previousStatus:
          transition.previousStatus,

        status:
          transition.status,
      },

      implementationPlan: {
        id: updatedImplementationPlan.id,

        experimentId:
          updatedImplementationPlan.experiment_id,

        recommendationId:
          updatedImplementationPlan.recommendation_id,

        title:
          updatedImplementationPlan.title,

        status:
          updatedImplementationPlan.status,

        productionAuthorized: Boolean(
          updatedImplementationPlan.production_authorized
        ),

        updatedAt:
          updatedImplementationPlan.updated_at,
      },

      governance: {
        productionAuthorized: false,
        message:
          "This lifecycle transition does not authorize automatic production implementation.",
      },
    });
  } catch (error) {
    console.error(
      "Failed to transition governed implementation plan:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "The implementation plan status transition could not be completed.",
      },
      {
        status: 500,
      }
    );
  }
}
