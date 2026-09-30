"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import type {
  ImplementationPlanStatus,
} from "@/lib/implementationPlanRepository";

type Props = {
  implementationPlanId: number;
  status: ImplementationPlanStatus;
};

type TransitionResponse = {
  success?: boolean;

  error?: string;

  transition?: {
    implementationPlanId: number;
    previousStatus: ImplementationPlanStatus;
    status: ImplementationPlanStatus;
  };

  governance?: {
    productionAuthorized: boolean;
    message: string;
  };
};

export default function ImplementationPlanLifecycleControls({
  implementationPlanId,
  status,
}: Props) {
  const router = useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function transitionImplementationPlan(
    nextStatus: ImplementationPlanStatus
  ) {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/admin/ai/implementation-plans/transition",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            implementationPlanId,
            nextStatus,
          }),
        }
      );

      const data =
        (await response.json()) as TransitionResponse;

      if (
        !response.ok ||
        data.success !== true ||
        !data.transition
      ) {
        throw new Error(
          data.error ||
            "The implementation plan status could not be changed."
        );
      }

      setMessage(
        `Implementation Plan #${implementationPlanId} moved from ${formatStatus(
          data.transition.previousStatus
        )} to ${formatStatus(
          data.transition.status
        )}.`
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (transitionError) {
      setError(
        transitionError instanceof Error
          ? transitionError.message
          : "The implementation plan status could not be changed."
      );
    }
  }

  if (status === "draft") {
    return (
      <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5">
        <p className="font-bold text-sky-950">
          Draft Implementation Plan Review
        </p>

        <p className="mt-2 text-sm leading-6 text-sky-900">
          The implementation plan is still a draft.
          Submit it for human review when the target,
          proposed changes, protected elements,
          measurement plan, and rollback plan are
          ready to be evaluated.
        </p>

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            transitionImplementationPlan(
              "ready-for-review"
            )
          }
          className="mt-4 rounded-lg bg-sky-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Submitting..."
            : "Submit for Human Review"}
        </button>

        <LifecycleFeedback
          message={message}
          error={error}
        />
      </div>
    );
  }

  if (status === "ready-for-review") {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-bold text-amber-950">
          Human Implementation Plan Review Required
        </p>

        <p className="mt-2 text-sm leading-6 text-amber-900">
          This implementation plan has been submitted
          for review. Authorization or rejection must
          be an explicit later human governance
          decision.
        </p>

        <p className="mt-4 text-sm font-semibold text-amber-950">
          No production implementation is authorized
          by this review state.
        </p>

        <LifecycleFeedback
          message={message}
          error={error}
        />
      </div>
    );
  }

  if (status === "authorized") {
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-bold text-emerald-950">
          Implementation Plan Authorized
        </p>

        <p className="mt-2 text-sm leading-6 text-emerald-900">
          The implementation plan has passed
          implementation plan governance review.
          Production implementation remains separately
          governed and has not been authorized
          automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5">
      <p className="font-bold text-rose-950">
        Implementation Plan Rejected
      </p>

      <p className="mt-2 text-sm leading-6 text-rose-900">
        This implementation plan was rejected during
        human governance review. No production
        implementation is authorized.
      </p>
    </div>
  );
}

function LifecycleFeedback({
  message,
  error,
}: {
  message: string | null;
  error: string | null;
}) {
  if (!message && !error) {
    return null;
  }

  return (
    <div
      className={
        error
          ? "mt-4 rounded-lg border border-rose-200 bg-white p-4 text-sm font-semibold text-rose-800"
          : "mt-4 rounded-lg border border-emerald-200 bg-white p-4 text-sm font-semibold text-emerald-800"
      }
    >
      {error || message}
    </div>
  );
}

function formatStatus(
  status: ImplementationPlanStatus
) {
  return status
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}
