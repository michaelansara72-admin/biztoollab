"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  consumeOperatingInputHandoff,
  writeOperatingInputHandoff,
  type OperatingInputHandoffFields,
} from "@/lib/finance/operatingInputHandoff";
import {
  readOperatingInputHistory,
  resolveOperatingInputInitialization,
  writeOperatingInputHistory,
  type OperatingInputHistoryFields,
} from "@/lib/finance/operatingInputHistory";

const EXAMPLE_AMOUNTS = {
  monthlyRevenue: "10000",
  variableCostRatePercent: "30",
  monthlyFixedCosts: "5000",
};

const CARRY_FAILURE_MESSAGE =
  "These amounts could not be carried in this browser. Your entries are still here.";

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
  const router = useRouter();
  const restoredInputs = useRef<{
    status: "pending" | "ready";
    fields: OperatingInputHandoffFields | null;
    carried: boolean;
  }>({ status: "pending", fields: null, carried: false });
  const wroteTransfer = useRef(false);
  const carriedNoticeRef = useRef<HTMLParagraphElement>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState(
    EXAMPLE_AMOUNTS.monthlyRevenue,
  );
  const [variableCostRatePercent, setVariableCostRatePercent] = useState(
    EXAMPLE_AMOUNTS.variableCostRatePercent,
  );
  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState(
    EXAMPLE_AMOUNTS.monthlyFixedCosts,
  );
  const [carriedNotice, setCarriedNotice] = useState(false);
  const [carryError, setCarryError] = useState("");

  useEffect(() => {
    const saved = restoredInputs.current;

    if (saved.status === "ready") {
      if (saved.fields) {
        applyFields(saved.fields);
        setCarriedNotice(saved.carried);
      }
      return;
    }

    // A one-time handoff wins. Otherwise restore this history entry.
    // Examples stay in place when neither is usable. The ref keeps the
    // first result so a Strict Mode replay does not consume the handoff
    // again or replace a restored draft with the examples.
    const handoff = consumeOperatingInputHandoff("operating-outlook");
    const history = handoff.ok
      ? { ok: false as const }
      : readOperatingInputHistory("operating-outlook");
    const selected = resolveOperatingInputInitialization(
      handoff.ok ? { ok: true, fields: handoff.fields } : { ok: false },
      history.ok ? { ok: true, fields: history.fields } : { ok: false },
      EXAMPLE_AMOUNTS,
    );

    restoredInputs.current = {
      status: "ready",
      fields: selected.source === "example" ? null : selected.fields,
      carried: selected.carried,
    };

    if (selected.source === "example") {
      return;
    }

    applyFields(selected.fields);
    setCarriedNotice(selected.carried);

    if (selected.writeHistory) {
      writeOperatingInputHistory("operating-outlook", selected.fields);
    }
  }, []);

  useEffect(() => {
    if (!carriedNotice) {
      return;
    }

    carriedNoticeRef.current?.focus();
  }, [carriedNotice]);

  function clearCarryStatus() {
    setCarryError("");
    setCarriedNotice(false);
  }

  function applyFields(fields: OperatingInputHistoryFields) {
    setMonthlyRevenue(fields.monthlyRevenue);
    setVariableCostRatePercent(fields.variableCostRatePercent);
    setMonthlyFixedCosts(fields.monthlyFixedCosts);
  }

  function fieldsWith(
    field: OperatingOutlookField,
    value: string,
  ): OperatingInputHistoryFields {
    return {
      monthlyRevenue: field === "monthlyRevenue" ? value : monthlyRevenue,
      variableCostRatePercent:
        field === "variableCostRatePercent" ? value : variableCostRatePercent,
      monthlyFixedCosts:
        field === "monthlyFixedCosts" ? value : monthlyFixedCosts,
    };
  }

  function restoreExampleAmounts() {
    if (!wroteTransfer.current) {
      consumeOperatingInputHandoff("operating-outlook");
    }

    applyFields(EXAMPLE_AMOUNTS);
    clearCarryStatus();
    writeOperatingInputHistory("operating-outlook", EXAMPLE_AMOUNTS);
  }

  function carryInputs(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();

    if (!view.result) {
      return;
    }

    wroteTransfer.current = true;
    const written = writeOperatingInputHandoff("operating-outlook", {
      monthlyRevenue,
      variableCostRatePercent,
      monthlyFixedCosts,
    });

    if (!written.ok) {
      wroteTransfer.current = false;
      setCarryError(CARRY_FAILURE_MESSAGE);
      return;
    }

    setCarryError("");
    writeOperatingInputHistory("operating-outlook", {
      monthlyRevenue,
      variableCostRatePercent,
      monthlyFixedCosts,
    });
    router.push("/calculators/operating-resilience");
  }

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
                  onChange={(event) => {
                    clearCarryStatus();
                    const nextValue = event.target.value;
                    setters[field.field](nextValue);
                    writeOperatingInputHistory(
                      "operating-outlook",
                      fieldsWith(field.field, nextValue),
                    );
                  }}
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

      <button
        type="button"
        onClick={restoreExampleAmounts}
        className="mt-5 text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        Use the example amounts
      </button>

      {carriedNotice ? (
        <p
          ref={carriedNoticeRef}
          tabIndex={-1}
          className="mt-4 max-w-3xl text-sm leading-6 text-slate-700 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          These fields use amounts carried from the Operating Resilience
          Assessment. You can edit them or use the example amounts.
        </p>
      ) : null}

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
            <div className="mt-8 max-w-3xl">
              <Link
                href="/calculators/operating-resilience"
                onClick={carryInputs}
                aria-describedby="resilience-handoff-help"
                className="inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                Explore operating resilience
              </Link>
              <p
                id="resilience-handoff-help"
                className="mt-3 text-sm leading-6 text-slate-600"
              >
                Carries the monthly revenue, variable-cost percentage, and
                fixed costs now in these fields to the Operating Resilience
                Assessment in this tab. They stay in this tab until that page
                reads them.
              </p>
              {carryError ? (
                <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
                  {carryError}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
