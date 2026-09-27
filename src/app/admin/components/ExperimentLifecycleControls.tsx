"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import type {
  ExperimentStatus,
} from "@/lib/experimentRepository";

type Props = {
  experimentId: number;
  status: ExperimentStatus;
};

type TransitionResponse = {
  success?: boolean;

  error?: string;

  transition?: {
    experimentId: number;
    previousStatus: ExperimentStatus;
    status: ExperimentStatus;
  };

  governance?: {
    productionAuthorized: boolean;
    message: string;
  };
};

export default function ExperimentLifecycleControls({
  experimentId,
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

  async function transitionExperiment(
    nextStatus: ExperimentStatus
  ) {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/admin/ai/experiments/transition",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            experimentId,
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
            "The experiment status could not be changed."
        );
      }

      setMessage(
        `Experiment #${experimentId} moved from ${formatStatus(
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
          : "The experiment status could not be changed."
      );
    }
  }

  if (status === "draft") {
    return (
      <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-5">
        <p className="font-bold text-violet-950">
          Draft Experiment Review
        </p>

        <p className="mt-2 text-sm leading-6 text-violet-900">
          The experiment is still a draft. Submit it
          for human review when the hypothesis,
          proposed change, control, and success
          criteria are ready to be evaluated.
        </p>

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            transitionExperiment(
              "ready-for-review"
            )
          }
          className="mt-4 rounded-lg bg-violet-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
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
          Human Experiment Review Required
        </p>

        <p className="mt-2 text-sm leading-6 text-amber-900">
          This experiment has been submitted for
          review. Approval or rejection must be an
          explicit human governance decision.
        </p>

        <p className="mt-4 text-sm font-semibold text-amber-950">
          No production implementation is authorized
          by this review state.
        </p>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-bold text-emerald-950">
          Experiment Approved
        </p>

        <p className="mt-2 text-sm leading-6 text-emerald-900">
          The experiment has passed experiment
          governance review. Production implementation
          remains separately governed and has not been
          authorized automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5">
      <p className="font-bold text-rose-950">
        Experiment Rejected
      </p>

      <p className="mt-2 text-sm leading-6 text-rose-900">
        This experiment was rejected during human
        governance review. No production implementation
        is authorized.
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
  status: ExperimentStatus
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