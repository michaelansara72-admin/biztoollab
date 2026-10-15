"use client";

import { useMemo, useState } from "react";
import { calculateOperatingOutlook } from "@/lib/finance/calculateOperatingOutlook";
import type { OperatingOutlookScenario } from "@/lib/finance/calculateOperatingOutlook";
import {
  OPERATING_OUTLOOK_SCENARIO_EXPLANATION,
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

function formatMargin(value: number) {
  return `${value.toFixed(1)}%`;
}

function ScenarioCard({
  title,
  detail,
  scenario,
  emphasized = false,
}: {
  title: string;
  detail: string;
  scenario: OperatingOutlookScenario;
  emphasized?: boolean;
}) {
  const marginMessage = undefinedOperatingMarginMessage(
    scenario.operatingMarginPercent,
  );
  const showBreakEvenAmount =
    scenario.breakEvenStatus === "unique-threshold" &&
    scenario.breakEvenRevenue !== null;

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        emphasized ? "border-2 border-slate-900" : "border-slate-200"
      }`}
    >
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>

      <dl className="mt-5 space-y-4">
        <div>
          <dt className="text-sm text-slate-500">Monthly revenue</dt>
          <dd className="mt-1 text-xl font-semibold">
            {currency.format(scenario.monthlyRevenue)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Monthly fixed costs</dt>
          <dd className="mt-1 text-xl font-semibold">
            {currency.format(scenario.monthlyFixedCosts)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Variable costs</dt>
          <dd className="mt-1 text-xl font-semibold">
            {currency.format(scenario.variableCosts)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">
            Operating profit before financing and taxes
          </dt>
          <dd className="mt-1 text-xl font-semibold">
            {currency.format(scenario.operatingProfitBeforeFinancingAndTaxes)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Operating margin</dt>
          <dd
            className={
              marginMessage
                ? "mt-1 text-sm font-semibold leading-6"
                : "mt-1 text-xl font-semibold"
            }
          >
            {scenario.operatingMarginPercent === null
              ? marginMessage
              : formatMargin(scenario.operatingMarginPercent)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Break-even revenue</dt>
          <dd
            className={
              showBreakEvenAmount
                ? "mt-1 text-xl font-semibold"
                : "mt-1 text-sm font-semibold leading-6"
            }
          >
            {showBreakEvenAmount && scenario.breakEvenRevenue !== null
              ? currency.format(scenario.breakEvenRevenue)
              : operatingOutlookBreakEvenMessage(scenario.breakEvenStatus)}
          </dd>
          {showBreakEvenAmount ? (
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {operatingOutlookBreakEvenMessage(scenario.breakEvenStatus)}
            </p>
          ) : null}
        </div>
      </dl>
    </article>
  );
}

export default function OperatingOutlookCalculator() {
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
      return { fieldErrors, result: null, formError: null };
    }

    const calculation = calculateOperatingOutlook({
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
        formError: field ? null : message,
      };
    }

    return { fieldErrors, result: calculation.result, formError: null };
  }, [monthlyRevenue, variableCostRatePercent, monthlyFixedCosts]);

  return (
    <div className="mt-10">
      <form
        className="grid gap-5 md:grid-cols-3"
        onSubmit={(event) => event.preventDefault()}
      >
        {fields.map((field) => {
          const error = view.fieldErrors[field.field];
          const errorId = `${field.field}-error`;

          return (
            <label key={field.field} className="block">
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
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  value={values[field.field]}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  onChange={(event) =>
                    setters[field.field](event.target.value)
                  }
                  className="w-full px-4 py-3 text-slate-900 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
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
                <span className="mt-2 block text-xs leading-5 text-slate-500">
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
            <h2 className="text-2xl font-bold">Monthly scenarios</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {OPERATING_OUTLOOK_SCENARIO_EXPLANATION}
            </p>
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              <ScenarioCard
                title="Base"
                detail="Uses the amounts you entered."
                scenario={view.result.base}
                emphasized
              />
              <ScenarioCard
                title="Downside"
                detail="Revenue decreases 15%. Fixed costs increase 10%."
                scenario={view.result.downside}
              />
              <ScenarioCard
                title="Upside"
                detail="Revenue increases 15%. Fixed costs stay unchanged."
                scenario={view.result.upside}
              />
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
