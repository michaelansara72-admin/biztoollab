"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function StartupCostCalculator() {
  const [equipment, setEquipment] = useState(15000);
  const [leaseDeposit, setLeaseDeposit] = useState(6000);
  const [licenses, setLicenses] = useState(1500);
  const [inventory, setInventory] = useState(8000);
  const [technology, setTechnology] = useState(2500);
  const [marketing, setMarketing] = useState(3000);
  const [professionalServices, setProfessionalServices] = useState(2500);
  const [insuranceSetup, setInsuranceSetup] = useState(1200);
  const [otherOneTimeCosts, setOtherOneTimeCosts] = useState(2000);

  const [monthlyRent, setMonthlyRent] = useState(2500);
  const [monthlyPayroll, setMonthlyPayroll] = useState(6000);
  const [monthlyUtilities, setMonthlyUtilities] = useState(800);
  const [monthlySoftware, setMonthlySoftware] = useState(300);
  const [monthlyInsurance, setMonthlyInsurance] = useState(250);
  const [monthlyMarketing, setMonthlyMarketing] = useState(800);
  const [monthlyOther, setMonthlyOther] = useState(500);

  const [reserveMonths, setReserveMonths] = useState(3);
  const [contingencyPercent, setContingencyPercent] = useState(10);

  const results = useMemo(() => {
    const oneTimeStartupCosts =
      equipment +
      leaseDeposit +
      licenses +
      inventory +
      technology +
      marketing +
      professionalServices +
      insuranceSetup +
      otherOneTimeCosts;

    const monthlyOperatingCosts =
      monthlyRent +
      monthlyPayroll +
      monthlyUtilities +
      monthlySoftware +
      monthlyInsurance +
      monthlyMarketing +
      monthlyOther;

    const cashReserve = monthlyOperatingCosts * reserveMonths;

    const contingency =
      (oneTimeStartupCosts + cashReserve) *
      (Math.max(contingencyPercent, 0) / 100);

    const totalCapitalNeeded =
      oneTimeStartupCosts + cashReserve + contingency;

    return {
      oneTimeStartupCosts,
      monthlyOperatingCosts,
      cashReserve,
      contingency,
      totalCapitalNeeded,
    };
  }, [
    equipment,
    leaseDeposit,
    licenses,
    inventory,
    technology,
    marketing,
    professionalServices,
    insuranceSetup,
    otherOneTimeCosts,
    monthlyRent,
    monthlyPayroll,
    monthlyUtilities,
    monthlySoftware,
    monthlyInsurance,
    monthlyMarketing,
    monthlyOther,
    reserveMonths,
    contingencyPercent,
  ]);

  const currency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const NumberField = ({
    label,
    value,
    onChange,
    prefix,
    suffix,
    step = "1",
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    prefix?: string;
    suffix?: string;
    step?: string;
  }) => (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-slate-500">
        {prefix && (
          <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-slate-500">
            {prefix}
          </span>
        )}

        <input
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(event) =>
            onChange(Math.max(0, Number(event.target.value) || 0))
          }
          className="w-full px-4 py-3 text-slate-900 outline-none"
        />

        {suffix && (
          <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight">
              BizToolLab
            </Link>
            <p className="text-xs text-slate-500">
              Smart tools for smarter business decisions
            </p>
          </div>

          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to tools
          </Link>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500">
            Startup Tool
          </p>

          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
            Startup Cost Calculator
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Estimate one-time startup expenses, monthly operating costs,
            recommended cash reserves, contingency funds, and the total capital
            you may need to launch a business.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">One-Time Startup Costs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the upfront costs required before opening or launching.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Equipment and machinery"
                value={equipment}
                onChange={setEquipment}
                prefix="$"
                step="100"
              />

              <NumberField
                label="Lease deposit / buildout"
                value={leaseDeposit}
                onChange={setLeaseDeposit}
                prefix="$"
                step="100"
              />

              <NumberField
                label="Licenses and permits"
                value={licenses}
                onChange={setLicenses}
                prefix="$"
                step="100"
              />

              <NumberField
                label="Initial inventory"
                value={inventory}
                onChange={setInventory}
                prefix="$"
                step="100"
              />

              <NumberField
                label="Technology and systems"
                value={technology}
                onChange={setTechnology}
                prefix="$"
                step="100"
              />

              <NumberField
                label="Launch marketing"
                value={marketing}
                onChange={setMarketing}
                prefix="$"
                step="100"
              />

              <NumberField
                label="Professional services"
                value={professionalServices}
                onChange={setProfessionalServices}
                prefix="$"
                step="100"
              />

              <NumberField
                label="Insurance setup / deposits"
                value={insuranceSetup}
                onChange={setInsuranceSetup}
                prefix="$"
                step="100"
              />

              <NumberField
                label="Other one-time costs"
                value={otherOneTimeCosts}
                onChange={setOtherOneTimeCosts}
                prefix="$"
                step="100"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Monthly Operating Expenses
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Estimate the recurring costs your business will need to cover each
              month.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Rent / lease"
                value={monthlyRent}
                onChange={setMonthlyRent}
                prefix="$"
                step="100"
              />

              <NumberField
                label="Payroll"
                value={monthlyPayroll}
                onChange={setMonthlyPayroll}
                prefix="$"
                step="100"
              />

              <NumberField
                label="Utilities"
                value={monthlyUtilities}
                onChange={setMonthlyUtilities}
                prefix="$"
                step="50"
              />

              <NumberField
                label="Software / subscriptions"
                value={monthlySoftware}
                onChange={setMonthlySoftware}
                prefix="$"
                step="50"
              />

              <NumberField
                label="Insurance"
                value={monthlyInsurance}
                onChange={setMonthlyInsurance}
                prefix="$"
                step="50"
              />

              <NumberField
                label="Ongoing marketing"
                value={monthlyMarketing}
                onChange={setMonthlyMarketing}
                prefix="$"
                step="50"
              />

              <NumberField
                label="Other monthly expenses"
                value={monthlyOther}
                onChange={setMonthlyOther}
                prefix="$"
                step="50"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Cash Reserve Planning</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a working-capital cushion and contingency allowance for
              unexpected costs.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Months of operating reserve"
                value={reserveMonths}
                onChange={setReserveMonths}
                suffix="months"
                step="1"
              />

              <NumberField
                label="Contingency allowance"
                value={contingencyPercent}
                onChange={setContingencyPercent}
                suffix="%"
                step="0.5"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-500">Advertisement</p>
            <p className="mt-1 text-xs text-slate-400">
              Future advertising space
            </p>
          </div>
        </div>

        <aside>
          <div className="sticky top-6 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl">
            <div className="border-b border-slate-800 p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Estimated Startup Need
              </p>

              <div className="mt-5">
                <p className="text-sm text-slate-400">Total Capital Needed</p>
                <p className="mt-1 text-4xl font-bold">
                  {currency(results.totalCapitalNeeded)}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-sm text-slate-400">
                  Monthly Operating Costs
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {currency(results.monthlyOperatingCosts)}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <ResultRow
                label="One-Time Startup Costs"
                value={currency(results.oneTimeStartupCosts)}
              />

              <ResultRow
                label="Monthly Operating Costs"
                value={currency(results.monthlyOperatingCosts)}
              />

              <ResultRow
                label={`${reserveMonths} Month Cash Reserve`}
                value={currency(results.cashReserve)}
              />

              <ResultRow
                label="Contingency Fund"
                value={currency(results.contingency)}
              />

              <div className="border-t border-slate-800 pt-4">
                <ResultRow
                  label="Estimated Total Capital"
                  value={currency(results.totalCapitalNeeded)}
                />
              </div>
            </div>

            <div className="border-t border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold">Quick interpretation</p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Based on these assumptions, you may want approximately{" "}
                {currency(results.totalCapitalNeeded)} available before launch,
                including startup expenses, operating reserves, and a
                contingency cushion.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">
            How the Startup Cost Calculator Works
          </h2>

          <div className="mt-6 space-y-5 leading-7 text-slate-600">
            <p>
              One-time startup costs include expenses you typically pay before
              launch, such as equipment, lease deposits, permits, inventory,
              technology, launch marketing, professional services, and other
              setup expenses.
            </p>

            <p>
              Monthly operating costs represent recurring expenses that may
              continue after opening, including rent, payroll, utilities,
              insurance, software, marketing, and other overhead.
            </p>

            <p>
              The cash reserve is calculated by multiplying estimated monthly
              operating expenses by the number of reserve months entered.
            </p>

            <p>
              The contingency allowance adds an extra percentage to your
              startup costs and cash reserve to help account for unexpected
              expenses or cost overruns.
            </p>

            <p>
              Total capital needed combines estimated one-time startup costs,
              your working-capital reserve, and the contingency allowance.
            </p>
          </div>

          <div className="mt-10 rounded-2xl bg-slate-100 p-6">
            <h3 className="font-semibold">Important</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This calculator provides estimates for educational and planning
              purposes only. Actual startup costs can vary substantially based
              on industry, location, business model, staffing, financing,
              licensing requirements, construction, inventory needs, taxes,
              professional fees, and other operating conditions.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}