import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

import {
  getExperimentById,
} from "@/lib/experimentRepository";

import {
  getImplementationPlanById,
  getLatestImplementationPlanForExperiment,
  saveImplementationPlan,
} from "@/lib/implementationPlanRepository";

import {
  implementationPlanCreateFailure,
} from "@/lib/mysqlDuplicateEntryError";

export const runtime = "nodejs";

type CreateImplementationPlanRequest = {
  experimentId?: unknown;
  recommendationId?: unknown;

  title?: unknown;

  targetPath?: unknown;

  proposedChanges?: unknown;

  protectedElements?: unknown;

  measurementPlan?: unknown;

  rollbackPlan?: unknown;
};

function isPositiveSafeInteger(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

export async function POST(
  request: Request
) {
  try {
    const cookieStore = await cookies();

    const adminToken = cookieStore.get(
      adminSessionCookie.name
    )?.value;

    if (
      !verifyAdminSessionToken(adminToken)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Admin authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as CreateImplementationPlanRequest;

    if (
      !isPositiveSafeInteger(
        body.experimentId
      )
    ) {
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

    if (
      !isPositiveSafeInteger(
        body.recommendationId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid recommendation ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isNonEmptyString(body.title)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Implementation plan title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isNonEmptyString(
        body.targetPath
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Implementation target path is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isNonEmptyString(
        body.proposedChanges
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Proposed implementation changes are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isNonEmptyString(
        body.protectedElements
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Protected implementation elements are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isNonEmptyString(
        body.measurementPlan
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "An implementation measurement plan is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isNonEmptyString(
        body.rollbackPlan
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "An implementation rollback plan is required.",
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
          error:
            "Experiment not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      experiment.status !== "approved"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only an approved experiment can advance into implementation planning.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      experiment.recommendation_id !==
      body.recommendationId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The implementation plan recommendation does not match the experiment lineage.",
        },
        {
          status: 409,
        }
      );
    }

    const existingPlan =
      await getLatestImplementationPlanForExperiment(
        experiment.id
      );

    if (existingPlan) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Experiment #${experiment.id} already has Implementation Plan #${existingPlan.id}.`,
        },
        {
          status: 409,
        }
      );
    }

    const result =
      await saveImplementationPlan({
        experimentId:
          experiment.id,

        recommendationId:
          experiment.recommendation_id,

        title:
          body.title,

        targetPath:
          body.targetPath,

        proposedChanges:
          body.proposedChanges,

        protectedElements:
          body.protectedElements,

        measurementPlan:
          body.measurementPlan,

        rollbackPlan:
          body.rollbackPlan,

        createdBy:
          "admin",
      });

    const implementationPlan =
      await getImplementationPlanById(
        result.id
      );

    if (!implementationPlan) {
      throw new Error(
        "Implementation plan was created but could not be retrieved."
      );
    }

    return NextResponse.json(
      {
        success: true,

        implementationPlan: {
          id:
            implementationPlan.id,

          experimentId:
            implementationPlan.experiment_id,

          recommendationId:
            implementationPlan.recommendation_id,

          title:
            implementationPlan.title,

          targetPath:
            implementationPlan.target_path,

          proposedChanges:
            implementationPlan.proposed_changes,

          protectedElements:
            implementationPlan.protected_elements,

          measurementPlan:
            implementationPlan.measurement_plan,

          rollbackPlan:
            implementationPlan.rollback_plan,

          status:
            implementationPlan.status,

          productionAuthorized:
            Boolean(
              implementationPlan.production_authorized
            ),

          createdBy:
            implementationPlan.created_by,

          createdAt:
            implementationPlan.created_at,

          updatedAt:
            implementationPlan.updated_at,
        },

        governance: {
          productionAuthorized: false,

          message:
            "Creating an implementation plan does not authorize production implementation.",
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Failed to create governed implementation plan:",
      error
    );

    const failure =
      implementationPlanCreateFailure(error);

    return NextResponse.json(
      {
        success: false,
        error: failure.error,
      },
      {
        status: failure.status,
      }
    );
  }
}
