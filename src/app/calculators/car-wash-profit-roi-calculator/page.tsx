"use client";

import AIAnalysisPanel from "@/components/ai/AIAnalysisPanel";
import { useAIAnalysis } from "@/hooks/useAIAnalysis";
import { useMemo, useState } from "react";

type NumberInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  help?: string;
};

function NumberInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  help,
}: NumberInputProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>

      {help && (
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {help}
        </span>
      )}

      <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-slate-500">
        {prefix && (
          <span className="pl-4 text-sm font-medium text-slate-500">
            {prefix}
          </span>
        )}

        <input
          type="number"
          min="0"
          step={step}
          defaultValue={value}
          onBlur={(event) => {
            const newValue = Math.max(
              0,
              Number(event.target.value) || 0
            );

            onChange(newValue);
            event.target.value = String(newValue);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="w-full rounded-xl bg-transparent px-4 py-3 text-slate-900 outline-none"
        />

        {suffix && (
          <span className="pr-4 text-sm font-medium text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyDetailed(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function ResultCard({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        emphasis
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-sm font-medium ${
          emphasis ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

const faqs = [
  {
    question: "How is car wash monthly revenue calculated?",
    answer:
      "Monthly revenue combines individually paid retail washes, membership subscription revenue, upsells or add-ons, and any other monthly revenue you enter. Membership washes are tracked separately so the calculator does not treat them as full-price retail washes.",
  },
  {
    question: "Why are membership washes separated from retail washes?",
    answer:
      "A membership customer may wash several times during the month while paying one recurring subscription fee. Those washes still create water, chemical, equipment, and other operating costs, but their revenue comes from the membership payment rather than a separate retail ticket for each visit.",
  },
  {
    question: "What costs should I include for a car wash?",
    answer:
      "Common costs can include water and sewer, chemicals, electricity or gas, payroll, rent or property costs, equipment maintenance, insurance, marketing, card-processing fees, financing payments, and other operating expenses. Your actual cost structure may differ depending on the type and location of the car wash.",
  },
  {
    question: "What does break-even retail cars per day mean?",
    answer:
      "It estimates how many individually paid retail washes per day are needed to cover the remaining monthly costs after the membership revenue, other revenue, membership wash costs, and fixed expenses entered in the calculator are considered.",
  },
  {
    question: "How does the car wash ROI calculation work?",
    answer:
      "Annual ROI is calculated by dividing estimated annual profit by the total purchase, startup, renovation, and equipment investment entered. It is a simplified planning estimate and does not account for every tax, financing, depreciation, or cash-flow factor.",
  },
  {
    question: "Can I use this calculator before buying a car wash?",
    answer:
      "Yes. You can enter assumptions from a business listing, seller financial statements, your own research, or a proposed startup plan. It can help you compare scenarios, but it should be used alongside proper financial, legal, operational, and due-diligence review.",
  },
];

const relatedCalculators = [
  {
    title: "Startup Cost Calculator",
    description:
      "Estimate startup expenses, reserves, contingency funds, and total capital needed.",
    href: "/calculators/startup-cost-calculator",
  },
  {
    title: "Break-Even Calculator",
    description:
      "Calculate break-even units, revenue, and target-profit requirements.",
    href: "/calculators/break-even-calculator",
  },
  {
    title: "Profit Margin Calculator",
    description:
      "Calculate gross profit, net profit, and business profit margins.",
    href: "/calculators/profit-margin-calculator",
  },
  {
    title: "ROI Calculator",
    description:
      "Estimate investment return, net profit, return multiple, and annualized return.",
    href: "/calculators/roi-calculator",
  },
  {
    title: "Laundromat Profit Calculator",
    description:
      "Estimate laundromat revenue, expenses, profit, ROI, and investment payback.",
    href: "/calculators/laundromat-profit-calculator",
  },
  {
    title: "Vending Machine Profit Calculator",
    description:
      "Estimate vending route revenue, expenses, profit, and investment return.",
    href: "/calculators/vending-machine-profit-calculator",
  },
];

export default function CarWashProfitROICalculator() {
      const {
    analysis: aiAnalysis,
    loading: aiLoading,
    error: aiError,
    cooldown: aiCooldown,
    analyze: runAIAnalysis,
  } = useAIAnalysis();
  const [retailCarsPerDay, setRetailCarsPerDay] = useState(75);
  const [operatingDays, setOperatingDays] = useState(30);
  const [averageWashPrice, setAverageWashPrice] = useState(15);

  const [members, setMembers] = useState(250);
  const [membershipPrice, setMembershipPrice] = useState(30);
  const [memberWashesPerMonth, setMemberWashesPerMonth] =
    useState(3);

  const [upsellRevenue, setUpsellRevenue] = useState(2000);
  const [otherRevenue, setOtherRevenue] = useState(500);

  const [waterCostPerWash, setWaterCostPerWash] =
    useState(0.75);
  const [chemicalCostPerWash, setChemicalCostPerWash] =
    useState(0.85);
  const [otherVariableCostPerWash, setOtherVariableCostPerWash] =
    useState(0.4);
  const [cardProcessingRate, setCardProcessingRate] =
    useState(3);

  const [labor, setLabor] = useState(7000);
  const [rentProperty, setRentProperty] = useState(4500);
  const [electricityGas, setElectricityGas] = useState(1800);
  const [maintenance, setMaintenance] = useState(1500);
  const [insurance, setInsurance] = useState(600);
  const [marketing, setMarketing] = useState(750);
  const [loanPayment, setLoanPayment] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(500);

  const [startupInvestment, setStartupInvestment] =
    useState(350000);
  const [renovationInvestment, setRenovationInvestment] =
    useState(50000);

  const results = useMemo(() => {
    const retailWashesPerMonth =
      retailCarsPerDay * operatingDays;

    const membershipWashesPerMonth =
      members * memberWashesPerMonth;

    const totalWashes =
      retailWashesPerMonth + membershipWashesPerMonth;

    const retailRevenue =
      retailWashesPerMonth * averageWashPrice;

    const membershipRevenue =
      members * membershipPrice;

    const totalRevenue =
      retailRevenue +
      membershipRevenue +
      upsellRevenue +
      otherRevenue;

    const variableCostPerWash =
      waterCostPerWash +
      chemicalCostPerWash +
      otherVariableCostPerWash;

    const monthlyVariableCosts =
      totalWashes * variableCostPerWash;

    const cardProcessingFees =
      totalRevenue * (cardProcessingRate / 100);

    const fixedMonthlyExpenses =
      labor +
      rentProperty +
      electricityGas +
      maintenance +
      insurance +
      marketing +
      loanPayment +
      otherExpenses;

    const totalMonthlyExpenses =
      monthlyVariableCosts +
      cardProcessingFees +
      fixedMonthlyExpenses;

    const monthlyProfit =
      totalRevenue - totalMonthlyExpenses;

    const annualProfit =
      monthlyProfit * 12;

    const profitMargin =
      totalRevenue > 0
        ? (monthlyProfit / totalRevenue) * 100
        : 0;

    const totalInvestment =
      startupInvestment + renovationInvestment;

    const annualROI =
      totalInvestment > 0
        ? (annualProfit / totalInvestment) * 100
        : 0;

    const paybackMonths =
      monthlyProfit > 0
        ? totalInvestment / monthlyProfit
        : null;

    const paybackYears =
      paybackMonths !== null
        ? paybackMonths / 12
        : null;

    const profitPerWash =
      totalWashes > 0
        ? monthlyProfit / totalWashes
        : 0;
const calculateSensitivity = ({
  testRetailCarsPerDay = retailCarsPerDay,
  testAverageWashPrice = averageWashPrice,
  testMembers = members,
  testLabor = labor,
  testRentProperty = rentProperty,
}: 
{
  testRetailCarsPerDay?: number;
  testAverageWashPrice?: number;
  testMembers?: number;
  testLabor?: number;
  testRentProperty?: number;
}) => {
  const testRetailWashesPerMonth =
    testRetailCarsPerDay * operatingDays;

  const testMembershipWashesPerMonth =
    testMembers * memberWashesPerMonth;

  const testTotalWashes =
    testRetailWashesPerMonth +
    testMembershipWashesPerMonth;

  const testRetailRevenue =
    testRetailWashesPerMonth *
    testAverageWashPrice;

  const testMembershipRevenue =
    testMembers * membershipPrice;

  const testTotalRevenue =
    testRetailRevenue +
    testMembershipRevenue +
    upsellRevenue +
    otherRevenue;

  const testMonthlyVariableCosts =
    testTotalWashes * variableCostPerWash;

  const testCardProcessingFees =
    testTotalRevenue *
    (cardProcessingRate / 100);

  const testFixedMonthlyExpenses =
    testLabor +
    testRentProperty +
    electricityGas +
    maintenance +
    insurance +
    marketing +
    loanPayment +
    otherExpenses;

  const testTotalMonthlyExpenses =
    testMonthlyVariableCosts +
    testCardProcessingFees +
    testFixedMonthlyExpenses;

  const testMonthlyProfit =
    testTotalRevenue -
    testTotalMonthlyExpenses;

  const testAnnualProfit =
    testMonthlyProfit * 12;

  const testAnnualROI =
    totalInvestment > 0
      ? (testAnnualProfit / totalInvestment) * 100
      : 0;

  return {
    monthlyProfit: testMonthlyProfit,
    annualROI: testAnnualROI,
  };
};

const retailTrafficSensitivity = {
  minus10Percent: calculateSensitivity({
    testRetailCarsPerDay: retailCarsPerDay * 0.9,
  }),
  plus10Percent: calculateSensitivity({
    testRetailCarsPerDay: retailCarsPerDay * 1.1,
  }),
};

const washPriceSensitivity = {
  minus10Percent: calculateSensitivity({
    testAverageWashPrice: averageWashPrice * 0.9,
  }),
  plus10Percent: calculateSensitivity({
    testAverageWashPrice: averageWashPrice * 1.1,
  }),
};
const membershipSensitivity = {
  minus10Percent: calculateSensitivity({
    testMembers: members * 0.9,
  }),
  plus10Percent: calculateSensitivity({
    testMembers: members * 1.1,
  }),
};
const laborSensitivity = {
  minus10Percent: calculateSensitivity({
    testLabor: labor * 0.9,
  }),
  plus10Percent: calculateSensitivity({
    testLabor: labor * 1.1,
  }),
};
const propertyCostSensitivity = {
  minus10Percent: calculateSensitivity({
    testRentProperty: rentProperty * 0.9,
  }),

    plus10Percent: calculateSensitivity({
    testRentProperty: rentProperty * 1.1,
  }),
};
const sensitivityRanking = [
  {
    key: "retailTraffic",
    label: "Retail Traffic",
    profitImpact:
      Math.abs(
        retailTrafficSensitivity.plus10Percent.monthlyProfit -
          monthlyProfit
      ) +
      Math.abs(
        retailTrafficSensitivity.minus10Percent.monthlyProfit -
          monthlyProfit
      ),
    roiImpact:
      Math.abs(
        retailTrafficSensitivity.plus10Percent.annualROI -
          annualROI
      ) +
      Math.abs(
        retailTrafficSensitivity.minus10Percent.annualROI -
          annualROI
      ),
  },
  {
    key: "washPrice",
    label: "Wash Price",
    profitImpact:
      Math.abs(
        washPriceSensitivity.plus10Percent.monthlyProfit -
          monthlyProfit
      ) +
      Math.abs(
        washPriceSensitivity.minus10Percent.monthlyProfit -
          monthlyProfit
      ),
    roiImpact:
      Math.abs(
        washPriceSensitivity.plus10Percent.annualROI -
          annualROI
      ) +
      Math.abs(
        washPriceSensitivity.minus10Percent.annualROI -
          annualROI
      ),
  },
  {
    key: "membership",
    label: "Membership Count",
    profitImpact:
      Math.abs(
        membershipSensitivity.plus10Percent.monthlyProfit -
          monthlyProfit
      ) +
      Math.abs(
        membershipSensitivity.minus10Percent.monthlyProfit -
          monthlyProfit
      ),
    roiImpact:
      Math.abs(
        membershipSensitivity.plus10Percent.annualROI -
          annualROI
      ) +
      Math.abs(
        membershipSensitivity.minus10Percent.annualROI -
          annualROI
      ),
  },
  {
    key: "labor",
    label: "Labor Cost",
    profitImpact:
      Math.abs(
        laborSensitivity.plus10Percent.monthlyProfit -
          monthlyProfit
      ) +
      Math.abs(
        laborSensitivity.minus10Percent.monthlyProfit -
          monthlyProfit
      ),
    roiImpact:
      Math.abs(
        laborSensitivity.plus10Percent.annualROI -
          annualROI
      ) +
      Math.abs(
        laborSensitivity.minus10Percent.annualROI -
          annualROI
      ),
  },
  {
    key: "propertyCost",
    label: "Property Cost",
    profitImpact:
      Math.abs(
        propertyCostSensitivity.plus10Percent.monthlyProfit -
          monthlyProfit
      ) +
      Math.abs(
        propertyCostSensitivity.minus10Percent.monthlyProfit -
          monthlyProfit
      ),
    roiImpact:
      Math.abs(
        propertyCostSensitivity.plus10Percent.annualROI -
          annualROI
      ) +
      Math.abs(
        propertyCostSensitivity.minus10Percent.annualROI -
          annualROI
      ),
  },
].sort(
  (a, b) =>
    b.profitImpact - a.profitImpact
);
    const retailContributionPerWash =
      averageWashPrice -
      variableCostPerWash -
      averageWashPrice * (cardProcessingRate / 100);

    const nonRetailRevenue =
      membershipRevenue +
      upsellRevenue +
      otherRevenue;

    const nonRetailCardFees =
      nonRetailRevenue *
      (cardProcessingRate / 100);

    const membershipVariableCosts =
      membershipWashesPerMonth *
      variableCostPerWash;

    const monthlyCostsBeforeRetailWashes =
      fixedMonthlyExpenses +
      membershipVariableCosts +
      nonRetailCardFees;

    const amountRetailMustCover =
      monthlyCostsBeforeRetailWashes -
      nonRetailRevenue;

    let breakEvenRetailWashesPerMonth:
      | number
      | null = null;

    if (retailContributionPerWash > 0) {
      breakEvenRetailWashesPerMonth =
        Math.max(
          0,
          amountRetailMustCover /
            retailContributionPerWash
        );
    }

    const breakEvenRetailCarsPerDay =
      breakEvenRetailWashesPerMonth !== null &&
      operatingDays > 0
        ? breakEvenRetailWashesPerMonth /
          operatingDays
        : null;
const trafficCushionCarsPerDay =
  breakEvenRetailCarsPerDay !== null
    ? retailCarsPerDay - breakEvenRetailCarsPerDay
    : null;

const trafficCushionPercent =
  breakEvenRetailCarsPerDay !== null &&
  retailCarsPerDay > 0
    ? ((retailCarsPerDay - breakEvenRetailCarsPerDay) /
        retailCarsPerDay) *
      100
    : null;
    
    const createScenario = (
      label: string,
      multiplier: number
    ) => {
      const scenarioRetailCarsPerDay =
        retailCarsPerDay * multiplier;

      const scenarioRetailWashesPerMonth =
        scenarioRetailCarsPerDay *
        operatingDays;

      const scenarioTotalWashes =
        scenarioRetailWashesPerMonth +
        membershipWashesPerMonth;

      const scenarioRetailRevenue =
        scenarioRetailWashesPerMonth *
        averageWashPrice;

      const scenarioTotalRevenue =
        scenarioRetailRevenue +
        membershipRevenue +
        upsellRevenue +
        otherRevenue;

      const scenarioVariableCosts =
        scenarioTotalWashes *
        variableCostPerWash;

      const scenarioCardFees =
        scenarioTotalRevenue *
        (cardProcessingRate / 100);

      const scenarioTotalExpenses =
        fixedMonthlyExpenses +
        scenarioVariableCosts +
        scenarioCardFees;

      const scenarioMonthlyProfit =
        scenarioTotalRevenue -
        scenarioTotalExpenses;

      const scenarioAnnualProfit =
        scenarioMonthlyProfit * 12;

      const scenarioProfitMargin =
        scenarioTotalRevenue > 0
          ? (scenarioMonthlyProfit /
              scenarioTotalRevenue) *
            100
          : 0;

      const scenarioAnnualROI =
        totalInvestment > 0
          ? (scenarioAnnualProfit /
              totalInvestment) *
            100
          : 0;

      return {
        label,
        retailCarsPerDay:
          scenarioRetailCarsPerDay,
        monthlyRevenue:
          scenarioTotalRevenue,
        monthlyProfit:
          scenarioMonthlyProfit,
        annualProfit:
          scenarioAnnualProfit,
        profitMargin:
          scenarioProfitMargin,
        annualROI:
          scenarioAnnualROI,
      };
    };

    const scenarios = [
      createScenario("Conservative", 0.75),
      createScenario("Expected", 1),
      createScenario("Strong", 1.25),
    ];

    return {
      retailWashesPerMonth,
      membershipWashesPerMonth,
      totalWashes,
      retailRevenue,
      membershipRevenue,
      totalRevenue,
      variableCostPerWash,
      monthlyVariableCosts,
      cardProcessingFees,
      fixedMonthlyExpenses,
      totalMonthlyExpenses,
      monthlyProfit,
      annualProfit,
      profitMargin,
      totalInvestment,
      annualROI,
      paybackMonths,
      paybackYears,
      profitPerWash,
breakEvenRetailCarsPerDay,
trafficCushionCarsPerDay,
trafficCushionPercent,
sensitivity: {
  retailTraffic: retailTrafficSensitivity,
  washPrice: washPriceSensitivity,
  membership: membershipSensitivity,
  labor: laborSensitivity,
  propertyCost: propertyCostSensitivity,
},
sensitivityRanking,
scenarios,
    };
  }, [
    retailCarsPerDay,
    operatingDays,
    averageWashPrice,
    members,
    membershipPrice,
    memberWashesPerMonth,
    upsellRevenue,
    otherRevenue,
    waterCostPerWash,
    chemicalCostPerWash,
    otherVariableCostPerWash,
    cardProcessingRate,
    labor,
    rentProperty,
    electricityGas,
    maintenance,
    insurance,
    marketing,
    loanPayment,
    otherExpenses,
    startupInvestment,
    renovationInvestment,
  ]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <a
            href="/calculators"
            className="text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            ← All Calculators
          </a>

          <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            BizToolLab
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
            Car Wash Profit & ROI Calculator
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Estimate car wash revenue, operating expenses,
            monthly and annual profit, break-even wash volume,
            return on investment, and investment payback.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Retail Wash Business
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter the average number of individually paid
              retail washes your location handles.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberInput
                label="Retail Cars per Day"
                value={retailCarsPerDay}
                onChange={setRetailCarsPerDay}
              />

              <NumberInput
                label="Operating Days per Month"
                value={operatingDays}
                onChange={setOperatingDays}
              />

              <NumberInput
                label="Average Retail Wash Price"
                value={averageWashPrice}
                onChange={setAverageWashPrice}
                prefix="$"
                step={0.5}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Membership Program
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Membership washes are tracked separately so their
              monthly subscription revenue is not double-counted
              as retail wash revenue.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberInput
                label="Active Members"
                value={members}
                onChange={setMembers}
              />

              <NumberInput
                label="Membership Price per Month"
                value={membershipPrice}
                onChange={setMembershipPrice}
                prefix="$"
              />

              <NumberInput
                label="Average Washes per Member / Month"
                value={memberWashesPerMonth}
                onChange={setMemberWashesPerMonth}
                step={0.5}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Additional Revenue
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberInput
                label="Monthly Upsell / Add-On Revenue"
                value={upsellRevenue}
                onChange={setUpsellRevenue}
                prefix="$"
              />

              <NumberInput
                label="Other Monthly Revenue"
                value={otherRevenue}
                onChange={setOtherRevenue}
                prefix="$"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Variable Wash Costs
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberInput
                label="Water & Sewer per Wash"
                value={waterCostPerWash}
                onChange={setWaterCostPerWash}
                prefix="$"
                step={0.05}
              />

              <NumberInput
                label="Chemicals per Wash"
                value={chemicalCostPerWash}
                onChange={setChemicalCostPerWash}
                prefix="$"
                step={0.05}
              />

              <NumberInput
                label="Other Variable Cost per Wash"
                value={otherVariableCostPerWash}
                onChange={setOtherVariableCostPerWash}
                prefix="$"
                step={0.05}
              />

              <NumberInput
                label="Card Processing Rate"
                value={cardProcessingRate}
                onChange={setCardProcessingRate}
                suffix="%"
                step={0.1}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Monthly Operating Expenses
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberInput
                label="Labor / Payroll"
                value={labor}
                onChange={setLabor}
                prefix="$"
              />

              <NumberInput
                label="Rent / Property Expense"
                value={rentProperty}
                onChange={setRentProperty}
                prefix="$"
              />

              <NumberInput
                label="Electricity / Gas"
                value={electricityGas}
                onChange={setElectricityGas}
                prefix="$"
              />

              <NumberInput
                label="Maintenance & Repairs"
                value={maintenance}
                onChange={setMaintenance}
                prefix="$"
              />

              <NumberInput
                label="Insurance"
                value={insurance}
                onChange={setInsurance}
                prefix="$"
              />

              <NumberInput
                label="Marketing"
                value={marketing}
                onChange={setMarketing}
                prefix="$"
              />

              <NumberInput
                label="Monthly Loan Payment"
                value={loanPayment}
                onChange={setLoanPayment}
                prefix="$"
              />

              <NumberInput
                label="Other Monthly Expenses"
                value={otherExpenses}
                onChange={setOtherExpenses}
                prefix="$"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Investment
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberInput
                label="Purchase / Startup Investment"
                value={startupInvestment}
                onChange={setStartupInvestment}
                prefix="$"
              />

              <NumberInput
                label="Renovation / Equipment Investment"
                value={renovationInvestment}
                onChange={setRenovationInvestment}
                prefix="$"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="sticky top-6 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                Estimated Results
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Car Wash Financial Summary
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <ResultCard
                  label="Monthly Revenue"
                  value={formatCurrency(
                    results.totalRevenue
                  )}
                />

                <ResultCard
                  label="Monthly Expenses"
                  value={formatCurrency(
                    results.totalMonthlyExpenses
                  )}
                />

                <ResultCard
                  label="Monthly Profit"
                  value={formatCurrency(
                    results.monthlyProfit
                  )}
                  emphasis
                />

                <ResultCard
                  label="Annual Profit"
                  value={formatCurrency(
                    results.annualProfit
                  )}
                />

                <ResultCard
                  label="Profit Margin"
                  value={`${results.profitMargin.toFixed(
                    1
                  )}%`}
                />

                <ResultCard
                  label="Annual ROI"
                  value={`${results.annualROI.toFixed(
                    1
                  )}%`}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">
                Operating Detail
              </h2>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Retail Washes / Month
                  </span>
                  <span className="font-semibold">
                    {Math.round(
                      results.retailWashesPerMonth
                    ).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Membership Washes / Month
                  </span>
                  <span className="font-semibold">
                    {Math.round(
                      results.membershipWashesPerMonth
                    ).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Total Washes / Month
                  </span>
                  <span className="font-semibold">
                    {Math.round(
                      results.totalWashes
                    ).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Retail Revenue
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(
                      results.retailRevenue
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Membership Revenue
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(
                      results.membershipRevenue
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Variable Cost / Wash
                  </span>
                  <span className="font-semibold">
                    {formatCurrencyDetailed(
                      results.variableCostPerWash
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Monthly Variable Costs
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(
                      results.monthlyVariableCosts
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Card Processing Fees
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(
                      results.cardProcessingFees
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Profit per Wash
                  </span>
                  <span className="font-semibold">
                    {formatCurrencyDetailed(
                      results.profitPerWash
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">
                Break-Even & Investment
              </h2>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Break-Even Retail Cars / Day
                  </span>

                  <span className="font-semibold">
                    {results.breakEvenRetailCarsPerDay !==
                    null
                      ? results.breakEvenRetailCarsPerDay.toFixed(
                          1
                        )
                      : "N/A"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Total Investment
                  </span>

                  <span className="font-semibold">
                    {formatCurrency(
                      results.totalInvestment
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Investment Payback
                  </span>

                  <span className="font-semibold">
                    {results.paybackMonths !== null
                      ? `${results.paybackMonths.toFixed(
                          1
                        )} months`
                      : "No positive payback"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Approx. Payback
                  </span>

                  <span className="font-semibold">
                    {results.paybackYears !== null
                      ? `${results.paybackYears.toFixed(
                          1
                        )} years`
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {results.monthlyProfit <= 0 && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
                <p className="font-bold text-amber-900">
                  This scenario is not profitable.
                </p>

                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Based on the assumptions entered,
                  estimated monthly expenses are equal to
                  or greater than estimated monthly
                  revenue. Try adjusting wash volume,
                  pricing, membership revenue, or
                  expenses.
                </p>
              </div>
            )}
            <AIAnalysisPanel
  analysis={aiAnalysis}
  loading={aiLoading}
  error={aiError}
  cooldown={aiCooldown}
  onAnalyze={() =>
    runAIAnalysis({
      tool: "car-wash-profit-roi",
      analysisType: "scenario-comparison",
      inputs: {
        retailCarsPerDay,
        operatingDays,
        averageWashPrice,
        members,
        membershipPrice,
        memberWashesPerMonth,
        upsellRevenue,
        otherRevenue,
        waterCostPerWash,
        chemicalCostPerWash,
        otherVariableCostPerWash,
        cardProcessingRate,
        labor,
        rentProperty,
        electricityGas,
        maintenance,
        insurance,
        marketing,
        loanPayment,
        otherExpenses,
        startupInvestment,
        renovationInvestment,
      },
      results,
    })
  }
/>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
              Scenario Analysis
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              What If Car Wash Traffic Changes?
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              Compare a lower-volume, expected, and
              stronger-volume scenario using your current
              assumptions. Membership revenue, pricing,
              expenses, and other inputs remain the same
              while retail car volume changes.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {results.scenarios.map((scenario) => {
              const isExpected =
                scenario.label === "Expected";

              return (
                <div
                  key={scenario.label}
                  className={`rounded-2xl border p-6 shadow-sm ${
                    isExpected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p
                    className={`text-sm font-bold uppercase tracking-[0.14em] ${
                      isExpected
                        ? "text-slate-300"
                        : "text-slate-400"
                    }`}
                  >
                    {scenario.label}
                  </p>

                  <p className="mt-3 text-3xl font-bold">
                    {scenario.retailCarsPerDay.toFixed(1)}
                  </p>

                  <p
                    className={`mt-1 text-sm ${
                      isExpected
                        ? "text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    Retail cars per day
                  </p>

                  <div
                    className={`mt-6 space-y-4 border-t pt-5 text-sm ${
                      isExpected
                        ? "border-slate-700"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between gap-4">
                      <span
                        className={
                          isExpected
                            ? "text-slate-300"
                            : "text-slate-500"
                        }
                      >
                        Monthly Revenue
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(
                          scenario.monthlyRevenue
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span
                        className={
                          isExpected
                            ? "text-slate-300"
                            : "text-slate-500"
                        }
                      >
                        Monthly Profit
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(
                          scenario.monthlyProfit
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span
                        className={
                          isExpected
                            ? "text-slate-300"
                            : "text-slate-500"
                        }
                      >
                        Annual Profit
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(
                          scenario.annualProfit
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span
                        className={
                          isExpected
                            ? "text-slate-300"
                            : "text-slate-500"
                        }
                      >
                        Profit Margin
                      </span>
                      <span className="font-semibold">
                        {scenario.profitMargin.toFixed(1)}
                        %
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span
                        className={
                          isExpected
                            ? "text-slate-300"
                            : "text-slate-500"
                        }
                      >
                        Annual ROI
                      </span>
                      <span className="font-semibold">
                        {scenario.annualROI.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-sm leading-6 text-slate-500">
            Conservative uses 75% of your entered retail
            car volume, Expected uses 100%, and Strong uses
            125%. These scenarios are estimates and do not
            predict actual car wash performance.
          </p>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-3xl font-bold">
            How to Use the Car Wash Profit Calculator
          </h2>

          <div className="mt-8 space-y-6 leading-7 text-slate-600">
            <p>
              Start by entering the average number of
              individually paid retail cars you expect to
              wash each day, the number of operating days
              per month, and your average retail wash
              price.
            </p>

            <p>
              If your car wash offers monthly memberships,
              enter the number of active members, average
              membership price, and estimated number of
              washes each member uses per month.
            </p>

            <p>
              Add any monthly revenue from premium wash
              upgrades, detailing, vending, vacuums, or
              other services. Then enter the variable cost
              of completing each wash, including water,
              sewer, chemicals, and other per-wash costs.
            </p>

            <p>
              Enter monthly operating expenses such as
              payroll, property costs, utilities,
              maintenance, insurance, marketing,
              financing, and other expenses. Finally,
              enter the total investment required to
              purchase, build, renovate, or equip the
              business.
            </p>

            <p>
              The calculator will estimate revenue,
              expenses, profit, margin, ROI, investment
              payback, break-even retail traffic, and
              multiple traffic scenarios.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-3xl font-bold">
            Car Wash Profit Example
          </h2>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="leading-7 text-slate-600">
              Suppose a car wash averages{" "}
              <strong>75 retail cars per day</strong>,
              operates 30 days per month, and charges an
              average of <strong>$15 per retail wash</strong>.
              The business also has{" "}
              <strong>250 membership customers</strong>{" "}
              paying $30 per month and averaging three
              washes each month.
            </p>

            <p className="mt-5 leading-7 text-slate-600">
              Using the sample assumptions in this
              calculator, monthly revenue is approximately{" "}
              <strong>$43,750</strong>, while estimated
              monthly expenses are about{" "}
              <strong>$23,963</strong>. That produces
              estimated monthly profit of approximately{" "}
              <strong>$19,788</strong>.
            </p>

            <p className="mt-5 leading-7 text-slate-600">
              With an assumed total investment of{" "}
              <strong>$400,000</strong>, the example
              produces an estimated annual ROI of about{" "}
              <strong>59.4%</strong> and an investment
              payback period of approximately{" "}
              <strong>20.2 months</strong>.
            </p>

            <p className="mt-5 text-sm leading-6 text-slate-500">
              These figures are examples based on the
              calculator&apos;s default assumptions and
              are not estimates of typical car wash
              performance.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-3xl font-bold">
            Car Wash Profit Calculator FAQs
          </h2>

          <div className="mt-8 space-y-5">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <h3 className="text-lg font-bold">
                  {faq.question}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-3xl font-bold">
            Related Business Calculators
          </h2>

          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            Continue evaluating your business idea with
            these related BizToolLab calculators.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {relatedCalculators.map((calculator) => (
              <a
                key={calculator.href}
                href={calculator.href}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-sm"
              >
                <h3 className="font-bold text-slate-900">
                  {calculator.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {calculator.description}
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-900">
                  Open calculator →
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-2xl font-bold">
            About This Car Wash Profit Calculator
          </h2>

          <div className="mt-6 space-y-5 leading-7 text-slate-600">
            <p>
              This calculator separates individually paid
              retail washes from membership washes.
              Membership customers generate recurring
              subscription revenue while still creating
              water, chemical, equipment, and other
              per-wash operating costs.
            </p>

            <p>
              Break-even retail wash volume estimates how
              many individually paid cars per day are
              needed to cover the remaining business costs
              after the entered membership and additional
              revenue assumptions are considered.
            </p>

            <p>
              ROI and investment payback are simplified
              planning estimates based on the investment
              and profit assumptions entered above.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="font-bold">
              Important
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              This calculator is for educational and
              planning purposes only. Actual car wash
              revenue, costs, taxes, financing, equipment
              performance, membership usage, weather,
              competition, and profitability can vary
              significantly. Results should not be
              considered financial, investment, tax, or
              legal advice.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}