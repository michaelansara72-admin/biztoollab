"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

type Props = {
  experimentId: number;
  recommendationId: number;
};

type CreatePlanResponse = {
  success?: boolean;

  implementationPlan?: {
    id: number;
    experimentId: number;
    recommendationId: number;
    title: string;
    targetPath: string;
    status: string;
    productionAuthorized: boolean;
  };

  governance?: {
    productionAuthorized: boolean;
    message: string;
  };

  error?: string;
};

const plan = {
  title:
    "Car Wash Calculator SEO Implementation Plan",

  targetPath:
    "/calculators/car-wash-profit-roi-calculator",

  proposedChanges:
    "Prepare evidence-backed on-page SEO improvements for the Car Wash Profit & ROI Calculator. The implementation may refine page copy, headings, search-intent alignment, descriptive supporting content, and relevant on-page signals while preserving the calculator's primary business functionality. This plan authorizes planning and review only. It does not authorize production modification.",

  protectedElements:
    "Preserve the calculator formulas, calculation behavior, numeric input behavior, ROI logic, existing user-entered calculation workflow, and core calculator functionality. Do not introduce unrelated redesigns, advertising changes, tracking changes, pricing changes, or modifications outside the approved experiment scope.",

  measurementPlan:
    "Use the existing Search Console evidence and comparison workflow to establish the pre-implementation baseline. If a future production implementation is separately authorized, compare impressions, clicks, CTR, and average position against the established baseline. Evaluate whether observed changes support the experiment hypothesis without assuming causation from short-term movement alone.",

  rollbackPlan:
    "Before any future production implementation, preserve the current page state in version control. If an authorized implementation causes functional regression, material SEO deterioration, unexpected rendering behavior, or other unacceptable results, revert the implementation commit and restore the prior production version. Rollback authority does not require continuation of the experiment.",
};

export default function CreateImplementationPlanControl({
  experimentId,
  recommendationId,
}: Props) {
  const router = useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function createPlan() {
    if (isSubmitting || isPending) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/admin/ai/implementation-plans",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            experimentId,
            recommendationId,

            title:
              plan.title,

            targetPath:
              plan.targetPath,

            proposedChanges:
              plan.proposedChanges,

            protectedElements:
              plan.protectedElements,

            measurementPlan:
              plan.measurementPlan,

            rollbackPlan:
              plan.rollbackPlan,
          }),
        }
      );

      let result: CreatePlanResponse;

      try {
        result =
          (await response.json()) as CreatePlanResponse;
      } catch {
        throw new Error(
          "The implementation-plan service returned an unreadable response."
        );
      }

      if (
        !response.ok ||
        !result.success ||
        !result.implementationPlan
      ) {
        throw new Error(
          result.error ||
            "The implementation plan could not be created."
        );
      }

      if (
        result.implementationPlan
          .productionAuthorized
      ) {
        throw new Error(
          "Governance safety check failed: a newly created implementation plan must not authorize production."
        );
      }

      setMessage(
        `Implementation Plan #${result.implementationPlan.id} created in draft status. No production change has been authorized.`
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The implementation plan could not be created."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const busy =
    isSubmitting || isPending;

  return (
    <section className="mt-8 rounded-2xl border border-sky-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky-700">
            Implementation Planning
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Prepare Controlled Implementation Plan
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Experiment #{experimentId} has
            completed experiment review. The next
            governance step is to document exactly
            what could change, what must remain
            protected, how results would be measured,
            and how a future implementation could be
            rolled back.
          </p>
        </div>

        <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-800">
          Planning Only
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-bold uppercase text-slate-500">
            Target
          </p>

          <p className="mt-2 break-all font-semibold text-slate-900">
            {plan.targetPath}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-bold uppercase text-slate-500">
            Lineage
          </p>

          <p className="mt-2 font-semibold text-slate-900">
            Recommendation #{recommendationId}
            {" → "}
            Experiment #{experimentId}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">
          Proposed Changes
        </h3>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {plan.proposedChanges}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">
          Protected Elements
        </h3>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {plan.protectedElements}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">
          Measurement Plan
        </h3>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {plan.measurementPlan}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">
          Rollback Plan
        </h3>

        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {plan.rollbackPlan}
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-bold text-amber-950">
          No production authorization
        </p>

        <p className="mt-2 text-sm leading-6 text-amber-900">
          Creating this record saves the proposed
          implementation for governance review.
          It does not modify the calculator, deploy
          code, authorize production, or allow the AI
          system to make production changes.
        </p>
      </div>

      <div className="mt-6">
        <button
          type="button"
          disabled={busy}
          onClick={createPlan}
          className="rounded-lg bg-sky-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy
            ? "Creating Draft..."
            : "Create Draft Implementation Plan"}
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
          {error}
        </div>
      )}
    </section>
  );
}