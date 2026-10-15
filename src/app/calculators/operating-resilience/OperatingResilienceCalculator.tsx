"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  calculateOperatingResilience,
  type OperatingResilienceMarginOfSafety,
  type OperatingResilienceProfitStatus,
  type OperatingResilienceScenario,
} from "@/lib/finance/calculateOperatingResilience";
import {
  interpretOperatingResilience,
  operatingResilienceCentsDisplay,
  type OperatingResilienceFinding,
  type OperatingResilienceFindingCategory,
} from "@/lib/finance/operatingResilienceMessages";
import {
  operatingOutlookBreakEvenMessage,
  operatingOutlookInputMessage,
  operatingOutlookRejectionField,
  operatingOutlookRejectionMessage,
  parseOperatingOutlookNumber,
  undefinedOperatingMarginMessage,
  type OperatingOutlookField,
} from "@/lib/finance/operatingOutlookMessages";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fields: {
  field: OperatingOutlookField;
  label: string;
  prefix?: string;
  suffix?: string;
  helper: string;
}[] = [
  {
    field: "monthlyRevenue",
    label: "Monthly revenue",
    prefix: "$",
    helper: "Sales for one month, before costs.",
  },
  {
    field: "variableCostRatePercent",
    label: "Variable costs",
    suffix: "%",
    helper: "The percentage of revenue spent on costs that move with sales.",
  },
  {
    field: "monthlyFixedCosts",
    label: "Monthly fixed costs",
    prefix: "$",
    helper: "Costs that stay in place for the month even if sales change.",
  },
];

const categoryLabels: Record<OperatingResilienceFindingCategory, string> = {
  profitability: "Profitability",
  "break-even": "Break-even",
  downside: "Downside",
  limitation: "Limitation",
};

function formatPercentPoints(percent: number) {
  return `${percent.toFixed(1)}%`;
}

function formatSafetyPercent(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`;
}

function collapsedPercent(shown: string) {
  return shown === "0.0%" || shown === "-0.0%";
}

function profitStatusLabel(status: OperatingResilienceProfitStatus) {
  if (status === "positive") {
    return "Above zero";
  }

  if (status === "negative") {
    return "Below zero";
  }

  return "Exactly zero";
}

function gapStatusLabel(amount: number) {
  if (amount > 0) {
    return "Above break-even";
  }

  if (amount < 0) {
    return "Below break-even";
  }

  return "Exactly at break-even";
}

function MoneyFigure({
  amount,
  statusLabel,
}: {
  amount: number;
  statusLabel: string;
}) {
  const centsDisplay = operatingResilienceCentsDisplay(amount);

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700">{statusLabel}</p>
      <p className="mt-1 text-xl font-semibold">{currency.format(amount)}</p>
      {centsDisplay === "nonzero-rounds-to-zero-cents" ? (
        <p className="mt-1 text-sm leading-6 text-slate-600">
          The unrounded amount is {amount > 0 ? "above zero" : "below zero"} by
          less than one cent. This cent display is not an exact zero.
        </p>
      ) : null}
    </div>
  );
}

function OperatingMargin({ percent }: { percent: number | null }) {
  if (percent === null) {
    return (
      <p className="mt-1 text-sm font-semibold leading-6">
        {undefinedOperatingMarginMessage(null)}
      </p>
    );
  }

  const shown = formatPercentPoints(percent);

  return (
    <div>
      <p className="mt-1 text-xl font-semibold">{shown}</p>
      {percent !== 0 && collapsedPercent(shown) ? (
        <p className="mt-1 text-sm leading-6 text-slate-600">
          The unrounded operating margin is {percent > 0 ? "above" : "below"}{" "}
          zero. A one-decimal display of 0.0% is not an exact zero.
        </p>
      ) : null}
    </div>
  );
}

function BreakEvenFigure({ scenario }: { scenario: OperatingResilienceScenario }) {
  const showAmount =
    scenario.breakEvenStatus === "unique-threshold" &&
    scenario.breakEvenRevenue !== null;

  if (!showAmount || scenario.breakEvenRevenue === null) {
    return (
      <p className="mt-1 text-sm font-semibold leading-6">
        {operatingOutlookBreakEvenMessage(scenario.breakEvenStatus)}
      </p>
    );
  }

  return (
    <div>
      <p className="mt-1 text-xl font-semibold">
        {currency.format(scenario.breakEvenRevenue)}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {operatingOutlookBreakEvenMessage(scenario.breakEvenStatus)}
      </p>
    </div>
  );
}

function SafetyAmount({ margin }: { margin: OperatingResilienceMarginOfSafety }) {
  if (margin.amount === null) {
    return (
      <p className="mt-1 text-sm font-semibold leading-6">
        {margin.status === "unavailable-no-finite-threshold"
          ? "No finite break-even revenue is available, so margin of safety is not calculated."
          : "No single break-even revenue is available, so margin of safety is not calculated."}
      </p>
    );
  }

  return (
    <MoneyFigure amount={margin.amount} statusLabel={gapStatusLabel(margin.amount)} />
  );
}

function SafetyPercent({ margin }: { margin: OperatingResilienceMarginOfSafety }) {
  if (margin.ratio === null) {
    return (
      <p className="mt-1 text-sm font-semibold leading-6">
        {margin.status === "amount-defined-percent-unavailable"
          ? "Percentage unavailable because monthly revenue is zero."
          : "Percentage unavailable because margin of safety is not calculated."}
      </p>
    );
  }

  const shown = formatSafetyPercent(margin.ratio);

  return (
    <div>
      <p className="mt-1 text-xl font-semibold">{shown}</p>
      {margin.ratio !== 0 && collapsedPercent(shown) ? (
        <p className="mt-1 text-sm leading-6 text-slate-600">
          The unrounded margin-of-safety percentage is{" "}
          {margin.ratio > 0 ? "above" : "below"} zero. A one-decimal display of
          0.0% is not an exact zero.
        </p>
      ) : null}
    </div>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ScenarioPanel({
  title,
  detail,
  scenario,
  emphasized = false,
}: {
  title: string;
  detail: string;
  scenario: OperatingResilienceScenario;
  emphasized?: boolean;
}) {
  return (
    <article
      className={`min-w-0 rounded-2xl border bg-white p-5 shadow-sm ${
        emphasized ? "border-2 border-slate-900" : "border-slate-200"
      }`}
    >
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>
      <dl className="mt-5 space-y-4">
        <Metric label="Operating profit before financing and taxes">
          <MoneyFigure
            amount={scenario.operatingProfitBeforeFinancingAndTaxes}
            statusLabel={profitStatusLabel(scenario.profitStatus)}
          />
        </Metric>
        <Metric label="Operating margin">
          <OperatingMargin percent={scenario.operatingMarginPercent} />
        </Metric>
        <Metric label="Break-even revenue">
          <BreakEvenFigure scenario={scenario} />
        </Metric>
        <Metric label="Margin of safety">
          <SafetyAmount margin={scenario.marginOfSafety} />
        </Metric>
        <Metric label="Margin of safety percentage">
          <SafetyPercent margin={scenario.marginOfSafety} />
        </Metric>
      </dl>
    </article>
  );
}

function precisionNote(finding: OperatingResilienceFinding) {
  if (finding.precision?.centsDisplay !== "nonzero-rounds-to-zero-cents") {
    return null;
  }

  const classification = finding.precision.classification;
  const direction =
    classification === "positive"
      ? "above zero"
      : classification === "negative"
        ? "below zero"
        : classification;

  return `Precision: the unrounded classification is ${direction}. A two-decimal dollar amount that shows $0.00 is not an exact zero.`;
}

function FindingCard({ finding }: { finding: OperatingResilienceFinding }) {
  const note = precisionNote(finding);

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {categoryLabels[finding.category]}
      </p>
      <h3 className="mt-2 text-lg font-bold">{finding.headline}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{finding.explanation}</p>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        <span className="font-semibold">Next step: </span>
        {finding.nextStep}
      </p>
      {finding.caveat ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{finding.caveat}</p>
      ) : null}
      {note ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{note}</p>
      ) : null}
    </article>
  );
}

export default function OperatingResilienceCalculator() {
  const [monthlyRevenue, setMonthlyRevenue] = useState("10000");
  const [variableCostRatePercent, setVariableCostRatePercent] = useState("30");
  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState("5000");

  const values: Record<OperatingOutlookField, string> = {
    monthlyRevenue,
    variableCostRatePercent,
    monthlyFixedCosts,
  };

  const setters: Record<OperatingOutlookField, (value: string) => void> = {
    monthlyRevenue: setMonthlyRevenue,
    variableCostRatePercent: setVariableCostRatePercent,
    monthlyFixedCosts: setMonthlyFixedCosts,
  };

  const view = useMemo(() => {
    const parsed = {
      monthlyRevenue: parseOperatingOutlookNumber(monthlyRevenue),
      variableCostRatePercent: parseOperatingOutlookNumber(
        variableCostRatePercent,
      ),
      monthlyFixedCosts: parseOperatingOutlookNumber(monthlyFixedCosts),
    };
    const fieldErrors: Partial<Record<OperatingOutlookField, string>> = {};

    for (const field of Object.keys(parsed) as OperatingOutlookField[]) {
      const entry = parsed[field];

      if (!entry.ok) {
        fieldErrors[field] = operatingOutlookInputMessage(field, entry.reason);
      }
    }

    if (
      !parsed.monthlyRevenue.ok ||
      !parsed.variableCostRatePercent.ok ||
      !parsed.monthlyFixedCosts.ok
    ) {
      return { fieldErrors, result: null, findings: [], formError: null };
    }

    const calculation = calculateOperatingResilience({
      monthlyRevenue: parsed.monthlyRevenue.value,
      variableCostRatePercent: parsed.variableCostRatePercent.value,
      monthlyFixedCosts: parsed.monthlyFixedCosts.value,
    });

    if (!calculation.ok) {
      const field = operatingOutlookRejectionField(calculation.code);
      const message = operatingOutlookRejectionMessage(calculation.code);

      if (field) {
        fieldErrors[field] = message;
      }

      return {
        fieldErrors,
        result: null,
        findings: [],
        formError: field ? null : message,
      };
    }

    return {
      fieldErrors,
      result: calculation.result,
      findings: interpretOperatingResilience(calculation.result),
      formError: null,
    };
  }, [monthlyRevenue, variableCostRatePercent, monthlyFixedCosts]);

  const downsideDetail = view.result
    ? `Revenue multiplier ${view.result.downside.assumptions.revenueMultiplier}. Fixed-cost multiplier ${view.result.downside.assumptions.fixedCostMultiplier}. The variable-cost rate stays unchanged.`
    : "";

  return (
    <div className="mt-10">
      <form
        className="grid gap-5 md:grid-cols-3"
        onSubmit={(event) => event.preventDefault()}
      >
        {fields.map((field) => {
          const error = view.fieldErrors[field.field];
          const errorId = `${field.field}-error`;
          const helpId = `${field.field}-help`;

          return (
            <label key={field.field} className="block min-w-0">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                {field.label}
              </span>
              <span className="flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-slate-500">
                {field.prefix ? (
                  <span className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-slate-500">
                    {field.prefix}
                  </span>
                ) : null}
                <input
                  type="text"
                  name={field.field}
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  value={values[field.field]}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : helpId}
                  onChange={(event) =>
                    setters[field.field](event.target.value)
                  }
                  className="w-full min-w-0 px-4 py-3 text-slate-900 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                />
                {field.suffix ? (
                  <span className="flex items-center border-l border-slate-200 bg-slate-50 px-4 text-slate-500">
                    {field.suffix}
                  </span>
                ) : null}
              </span>
              {error ? (
                <span
                  id={errorId}
                  role="alert"
                  className="mt-2 block text-sm leading-6 text-red-700"
                >
                  {error}
                </span>
              ) : (
                <span
                  id={helpId}
                  className="mt-2 block text-xs leading-5 text-slate-500"
                >
                  {field.helper}
                </span>
              )}
            </label>
          );
        })}
      </form>

      <section aria-live="polite" className="mt-8">
        {view.formError ? (
          <p role="alert" className="text-sm leading-6 text-red-700">
            {view.formError}
          </p>
        ) : null}

        {view.result ? (
          <>
            <h2 className="text-2xl font-bold">This month</h2>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <ScenarioPanel
                title="Entered month"
                detail="Uses the amounts you entered."
                scenario={view.result.base}
                emphasized
              />
              <ScenarioPanel
                title="Downside illustration"
                detail={downsideDetail}
                scenario={view.result.downside}
              />
            </div>

            <h2 className="mt-10 text-2xl font-bold">What these figures suggest</h2>
            <div className="mt-6 grid gap-5">
              {view.findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
