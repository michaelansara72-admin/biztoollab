import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

import {
  getHumanDecisionById,
  recommendationExists,
} from "@/lib/humanDecisionRepository";

import {
  getExperimentById,
  saveExperiment,
} from "@/lib/experimentRepository";

export const runtime = "nodejs";

type CreateExperimentRequest = {
  recommendationId?: unknown;
  sourceDecisionId?: unknown;

  title?: unknown;
  hypothesis?: unknown;
  proposedChange?: unknown;
  controlDescription?: unknown;

  successMetric?: unknown;
  baselineValue?: unknown;
  targetValue?: unknown;
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

function optionalString(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(
      "Optional experiment fields must be strings."
    );
  }

  return value.trim() || null;
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
      (await request.json()) as CreateExperimentRequest;

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

    if (
      !isPositiveSafeInteger(
        body.sourceDecisionId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid source decision ID is required.",
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
          error: "Experiment title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isNonEmptyString(body.hypothesis)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Experiment hypothesis is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isNonEmptyString(body.proposedChange)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A proposed experiment change is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isNonEmptyString(body.successMetric)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "An experiment success metric is required.",
        },
        {
          status: 400,
        }
      );
    }

    const exists = await recommendationExists(
      body.recommendationId
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

    const sourceDecision =
      await getHumanDecisionById(
        body.sourceDecisionId
      );

    if (!sourceDecision) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Source governance decision not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      sourceDecision.recommendation_id !==
      body.recommendationId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The source governance decision does not belong to this recommendation.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      sourceDecision.decision !==
      "review-experiment"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This recommendation has not been authorized for experiment review.",
        },
        {
          status: 409,
        }
      );
    }

    let controlDescription: string | null;
    let baselineValue: string | null;
    let targetValue: string | null;

    try {
      controlDescription = optionalString(
        body.controlDescription
      );

      baselineValue = optionalString(
        body.baselineValue
      );

      targetValue = optionalString(
        body.targetValue
      );
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Optional experiment fields must contain valid text.",
        },
        {
          status: 400,
        }
      );
    }

    const result = await saveExperiment({
      recommendationId:
        body.recommendationId,

      sourceDecisionId:
        body.sourceDecisionId,

      title: body.title,
      hypothesis: body.hypothesis,
      proposedChange: body.proposedChange,
      controlDescription,

      successMetric: body.successMetric,
      baselineValue,
      targetValue,

      status: "draft",
      createdBy: "admin",
    });

    const experiment =
      await getExperimentById(result.id);

    if (!experiment) {
      throw new Error(
        "Experiment was created but could not be retrieved."
      );
    }

    return NextResponse.json(
      {
        success: true,
        experiment: {
          id: experiment.id,

          recommendationId:
            experiment.recommendation_id,

          sourceDecisionId:
            experiment.source_decision_id,

          title: experiment.title,
          hypothesis: experiment.hypothesis,

          proposedChange:
            experiment.proposed_change,

          controlDescription:
            experiment.control_description,

          successMetric:
            experiment.success_metric,

          baselineValue:
            experiment.baseline_value,

          targetValue:
            experiment.target_value,

          status: experiment.status,

          createdBy:
            experiment.created_by,

          createdAt:
            experiment.created_at,

          updatedAt:
            experiment.updated_at,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Failed to create governed experiment:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "The governed experiment could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}
