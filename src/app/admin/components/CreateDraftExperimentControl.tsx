"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  recommendationId: number;
  sourceDecisionId: number;
};

type ExperimentResponse = {
  success?: boolean;

  experiment?: {
    id?: number;
    recommendationId?: number;
    sourceDecisionId?: number;
    status?: string;
  };

  error?: string;
};

export default function CreateDraftExperimentControl({
  recommendationId,
  sourceDecisionId,
}: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(
    "Car Wash Calculator SEO Experiment"
  );

  const [hypothesis, setHypothesis] = useState(
    "Improving the car wash calculator page around demonstrated search demand and user intent may increase qualified organic visibility and engagement."
  );

  const [proposedChange, setProposedChange] = useState(
    "Prepare a controlled SEO test for the car wash calculator using evidence-backed improvements to page content, search-intent alignment, and supporting on-page signals. No production change is authorized by creating this draft."
  );

  const [
    controlDescription,
    setControlDescription,
  ] = useState(
    "Preserve the current car wash calculator experience as the baseline for comparison. Any future implementation must be separately reviewed and approved."
  );

  const [successMetric, setSuccessMetric] = useState(
    "Compare Search Console impressions, clicks, CTR, and average position against the pre-experiment baseline."
  );

  const [baselineValue, setBaselineValue] =
    useState("");

  const [targetValue, setTargetValue] =
    useState("");

  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const [experimentId, setExperimentId] =
    useState<number | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  async function handleCreateDraft() {
    if (
      status === "saving" ||
      status === "saved"
    ) {
      return;
    }

    if (
      !title.trim() ||
      !hypothesis.trim() ||
      !proposedChange.trim() ||
      !successMetric.trim()
    ) {
      setErrorMessage(
        "Title, hypothesis, proposed change, and success metric are required."
      );

      setStatus("error");

      return;
    }

    setStatus("saving");
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/admin/ai/experiments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recommendationId,
            sourceDecisionId,
            title,
            hypothesis,
            proposedChange,
            controlDescription,
            successMetric,
            baselineValue,
            targetValue,
          }),
        }
      );

      const data =
        (await response.json()) as ExperimentResponse;

      if (
        !response.ok ||
        !data.success ||
        typeof data.experiment?.id !== "number"
      ) {
        throw new Error(
          data.error ??
            "Unable to create draft experiment."
        );
      }

      setExperimentId(data.experiment.id);
      setStatus("saved");

      router.refresh();
    } catch (error) {
      console.error(
        "Failed to create draft experiment:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create draft experiment."
      );

      setStatus("error");
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-violet-700">
        Controlled Experiment Planning
      </p>

      <h3 className="mt-2 text-xl font-bold text-slate-900">
        Create Draft Experiment
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Recommendation #{recommendationId} has received
        human authorization to advance into experiment
        planning through Decision #{sourceDecisionId}.
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <label
            htmlFor={`experiment-title-${recommendationId}`}
            className="text-sm font-bold text-slate-700"
          >
            Experiment Title
          </label>

          <input
            id={`experiment-title-${recommendationId}`}
            type="text"
            value={title}
            disabled={
              status === "saving" ||
              status === "saved"
            }
            onChange={(event) =>
              setTitle(event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor={`experiment-hypothesis-${recommendationId}`}
            className="text-sm font-bold text-slate-700"
          >
            Hypothesis
          </label>

          <textarea
            id={`experiment-hypothesis-${recommendationId}`}
            value={hypothesis}
            disabled={
              status === "saving" ||
              status === "saved"
            }
            onChange={(event) =>
              setHypothesis(event.target.value)
            }
            rows={4}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor={`experiment-change-${recommendationId}`}
            className="text-sm font-bold text-slate-700"
          >
            Proposed Change
          </label>

          <textarea
            id={`experiment-change-${recommendationId}`}
            value={proposedChange}
            disabled={
              status === "saving" ||
              status === "saved"
            }
            onChange={(event) =>
              setProposedChange(event.target.value)
            }
            rows={5}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor={`experiment-control-${recommendationId}`}
            className="text-sm font-bold text-slate-700"
          >
            Control / Baseline Description
          </label>

          <textarea
            id={`experiment-control-${recommendationId}`}
            value={controlDescription}
            disabled={
              status === "saving" ||
              status === "saved"
            }
            onChange={(event) =>
              setControlDescription(
                event.target.value
              )
            }
            rows={4}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor={`experiment-metric-${recommendationId}`}
            className="text-sm font-bold text-slate-700"
          >
            Success Metric
          </label>

          <textarea
            id={`experiment-metric-${recommendationId}`}
            value={successMetric}
            disabled={
              status === "saving" ||
              status === "saved"
            }
            onChange={(event) =>
              setSuccessMetric(event.target.value)
            }
            rows={3}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor={`experiment-baseline-${recommendationId}`}
              className="text-sm font-bold text-slate-700"
            >
              Baseline Value
            </label>

            <input
              id={`experiment-baseline-${recommendationId}`}
              type="text"
              value={baselineValue}
              disabled={
                status === "saving" ||
                status === "saved"
              }
              onChange={(event) =>
                setBaselineValue(
                  event.target.value
                )
              }
              placeholder="Optional"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label
              htmlFor={`experiment-target-${recommendationId}`}
              className="text-sm font-bold text-slate-700"
            >
              Target Value
            </label>

            <input
              id={`experiment-target-${recommendationId}`}
              type="text"
              value={targetValue}
              disabled={
                status === "saving" ||
                status === "saved"
              }
              onChange={(event) =>
                setTargetValue(event.target.value)
              }
              placeholder="Optional"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-900">
          Governance boundary
        </p>

        <p className="mt-1 text-sm leading-6 text-amber-800">
          Creating this record creates a draft experiment
          plan only. It does not change the website,
          launch the experiment, approve implementation,
          or authorize production deployment.
        </p>
      </div>

      <button
        type="button"
        onClick={handleCreateDraft}
        disabled={
          status === "saving" ||
          status === "saved"
        }
        className="mt-5 rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "saving"
          ? "Creating Draft..."
          : status === "saved"
            ? "Draft Experiment Created"
            : "Create Draft Experiment"}
      </button>

      {status === "saved" &&
        experimentId !== null && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-800">
              Draft Experiment #{experimentId} created.
            </p>

            <p className="mt-1 text-sm text-emerald-700">
              The experiment remains in draft status
              and requires additional human review
              before implementation.
            </p>
          </div>
        )}

      {status === "error" && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-800">
            Draft experiment was not created.
          </p>

          {errorMessage && (
            <p className="mt-1 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </section>
  );
}