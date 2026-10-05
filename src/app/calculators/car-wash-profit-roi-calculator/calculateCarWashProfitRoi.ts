export type CarWashProfitRoiInputs = {
  retailCarsPerDay: number;
  operatingDays: number;
  averageWashPrice: number;
  members: number;
  membershipPrice: number;
  memberWashesPerMonth: number;
  upsellRevenue: number;
  otherRevenue: number;
  waterCostPerWash: number;
  chemicalCostPerWash: number;
  otherVariableCostPerWash: number;
  cardProcessingRate: number;
  labor: number;
  rentProperty: number;
  electricityGas: number;
  maintenance: number;
  insurance: number;
  marketing: number;
  loanPayment: number;
  otherExpenses: number;
  startupInvestment: number;
  renovationInvestment: number;
  customRetailCarsPerDay: number;
  customAverageWashPrice: number;
  customMembers: number;
  customLabor: number;
  customRentProperty: number;
};

export type CarWashSensitivityResult = {
  monthlyRevenue: number;
  monthlyProfit: number;
  annualProfit: number;
  profitMargin: number;
  annualROI: number;
  paybackMonths: number | null;
};

export type CarWashScenarioResult = {
  label: string;
  retailCarsPerDay: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  annualProfit: number;
  profitMargin: number;
  annualROI: number;
};

export type CarWashProfitRoiResults = {
  retailWashesPerMonth: number;
  membershipWashesPerMonth: number;
  totalWashes: number;
  retailRevenue: number;
  membershipRevenue: number;
  totalRevenue: number;
  variableCostPerWash: number;
  monthlyVariableCosts: number;
  cardProcessingFees: number;
  fixedMonthlyExpenses: number;
  totalMonthlyExpenses: number;
  monthlyProfit: number;
  annualProfit: number;
  profitMargin: number;
  totalInvestment: number;
  annualROI: number;
  paybackMonths: number | null;
  paybackYears: number | null;
  profitPerWash: number;
  breakEvenRetailCarsPerDay: number | null;
  trafficCushionCarsPerDay: number | null;
  trafficCushionPercent: number | null;
  sensitivity: {
    retailTraffic: {
      minus10Percent: CarWashSensitivityResult;
      plus10Percent: CarWashSensitivityResult;
    };
    washPrice: {
      minus10Percent: CarWashSensitivityResult;
      plus10Percent: CarWashSensitivityResult;
    };
    membership: {
      minus10Percent: CarWashSensitivityResult;
      plus10Percent: CarWashSensitivityResult;
    };
    labor: {
      minus10Percent: CarWashSensitivityResult;
      plus10Percent: CarWashSensitivityResult;
    };
    propertyCost: {
      minus10Percent: CarWashSensitivityResult;
      plus10Percent: CarWashSensitivityResult;
    };
  };
  sensitivityRanking: Array<{
    key: string;
    label: string;
    profitImpact: number;
    roiImpact: number;
  }>;
  combinedDownsideScenario: CarWashSensitivityResult;
  combinedUpsideScenario: CarWashSensitivityResult;
  customScenario: CarWashSensitivityResult;
  scenarios: CarWashScenarioResult[];
};

export const carWashProfitRoiDefaultInputs: CarWashProfitRoiInputs =
  {
    retailCarsPerDay: 75,
    operatingDays: 30,
    averageWashPrice: 15,
    members: 250,
    membershipPrice: 30,
    memberWashesPerMonth: 3,
    upsellRevenue: 2000,
    otherRevenue: 500,
    waterCostPerWash: 0.75,
    chemicalCostPerWash: 0.85,
    otherVariableCostPerWash: 0.4,
    cardProcessingRate: 3,
    labor: 7000,
    rentProperty: 4500,
    electricityGas: 1800,
    maintenance: 1500,
    insurance: 600,
    marketing: 750,
    loanPayment: 0,
    otherExpenses: 500,
    startupInvestment: 350000,
    renovationInvestment: 50000,
    customRetailCarsPerDay: 75,
    customAverageWashPrice: 15,
    customMembers: 250,
    customLabor: 7000,
    customRentProperty: 4500,
  };

export function calculateCarWashProfitRoi(
  inputs: CarWashProfitRoiInputs
): CarWashProfitRoiResults {
  const {
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
    customRetailCarsPerDay,
    customAverageWashPrice,
    customMembers,
    customLabor,
    customRentProperty,
  } = inputs;

  const retailWashesPerMonth =
    retailCarsPerDay * operatingDays;

  const membershipWashesPerMonth =
    members * memberWashesPerMonth;

  const totalWashes =
    retailWashesPerMonth + membershipWashesPerMonth;

  const retailRevenue =
    retailWashesPerMonth * averageWashPrice;

  const membershipRevenue = members * membershipPrice;

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

  const annualProfit = monthlyProfit * 12;

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
    paybackMonths !== null ? paybackMonths / 12 : null;

  const profitPerWash =
    totalWashes > 0 ? monthlyProfit / totalWashes : 0;

  const calculateSensitivity = ({
    testRetailCarsPerDay = retailCarsPerDay,
    testAverageWashPrice = averageWashPrice,
    testMembers = members,
    testLabor = labor,
    testRentProperty = rentProperty,
  }: {
    testRetailCarsPerDay?: number;
    testAverageWashPrice?: number;
    testMembers?: number;
    testLabor?: number;
    testRentProperty?: number;
  }): CarWashSensitivityResult => {
    const testRetailWashesPerMonth =
      testRetailCarsPerDay * operatingDays;

    const testMembershipWashesPerMonth =
      testMembers * memberWashesPerMonth;

    const testTotalWashes =
      testRetailWashesPerMonth +
      testMembershipWashesPerMonth;

    const testRetailRevenue =
      testRetailWashesPerMonth * testAverageWashPrice;

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
      testTotalRevenue * (cardProcessingRate / 100);

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
      testTotalRevenue - testTotalMonthlyExpenses;

    const testAnnualProfit = testMonthlyProfit * 12;

    const testProfitMargin =
      testTotalRevenue > 0
        ? (testMonthlyProfit / testTotalRevenue) * 100
        : 0;

    const testAnnualROI =
      totalInvestment > 0
        ? (testAnnualProfit / totalInvestment) * 100
        : 0;

    const testPaybackMonths =
      testMonthlyProfit > 0
        ? totalInvestment / testMonthlyProfit
        : null;

    return {
      monthlyRevenue: testTotalRevenue,
      monthlyProfit: testMonthlyProfit,
      annualProfit: testAnnualProfit,
      profitMargin: testProfitMargin,
      annualROI: testAnnualROI,
      paybackMonths: testPaybackMonths,
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

  const combinedDownsideScenario = calculateSensitivity({
    testRetailCarsPerDay: retailCarsPerDay * 0.75,
    testAverageWashPrice: averageWashPrice * 0.9,
  });

  const customScenario = calculateSensitivity({
    testRetailCarsPerDay: customRetailCarsPerDay,
    testAverageWashPrice: customAverageWashPrice,
    testMembers: customMembers,
    testLabor: customLabor,
    testRentProperty: customRentProperty,
  });

  const combinedUpsideScenario = calculateSensitivity({
    testRetailCarsPerDay: retailCarsPerDay * 1.25,
    testAverageWashPrice: averageWashPrice * 1.1,
  });

  const sensitivityRanking = [
    {
      key: "retailTraffic",
      label: "Retail Traffic",
      profitImpact:
        Math.abs(
          retailTrafficSensitivity.plus10Percent
            .monthlyProfit - monthlyProfit
        ) +
        Math.abs(
          retailTrafficSensitivity.minus10Percent
            .monthlyProfit - monthlyProfit
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
          membershipSensitivity.minus10Percent
            .monthlyProfit - monthlyProfit
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
          propertyCostSensitivity.plus10Percent
            .monthlyProfit - monthlyProfit
        ) +
        Math.abs(
          propertyCostSensitivity.minus10Percent
            .monthlyProfit - monthlyProfit
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
  ].sort((a, b) => b.profitImpact - a.profitImpact);

  const retailContributionPerWash =
    averageWashPrice -
    variableCostPerWash -
    averageWashPrice * (cardProcessingRate / 100);

  const nonRetailRevenue =
    membershipRevenue + upsellRevenue + otherRevenue;

  const nonRetailCardFees =
    nonRetailRevenue * (cardProcessingRate / 100);

  const membershipVariableCosts =
    membershipWashesPerMonth * variableCostPerWash;

  const monthlyCostsBeforeRetailWashes =
    fixedMonthlyExpenses +
    membershipVariableCosts +
    nonRetailCardFees;

  const amountRetailMustCover =
    monthlyCostsBeforeRetailWashes - nonRetailRevenue;

  let breakEvenRetailWashesPerMonth: number | null = null;

  if (retailContributionPerWash > 0) {
    breakEvenRetailWashesPerMonth = Math.max(
      0,
      amountRetailMustCover / retailContributionPerWash
    );
  }

  const breakEvenRetailCarsPerDay =
    breakEvenRetailWashesPerMonth !== null &&
    operatingDays > 0
      ? breakEvenRetailWashesPerMonth / operatingDays
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
  ): CarWashScenarioResult => {
    const scenarioRetailCarsPerDay =
      retailCarsPerDay * multiplier;

    const scenarioRetailWashesPerMonth =
      scenarioRetailCarsPerDay * operatingDays;

    const scenarioTotalWashes =
      scenarioRetailWashesPerMonth +
      membershipWashesPerMonth;

    const scenarioRetailRevenue =
      scenarioRetailWashesPerMonth * averageWashPrice;

    const scenarioTotalRevenue =
      scenarioRetailRevenue +
      membershipRevenue +
      upsellRevenue +
      otherRevenue;

    const scenarioVariableCosts =
      scenarioTotalWashes * variableCostPerWash;

    const scenarioCardFees =
      scenarioTotalRevenue * (cardProcessingRate / 100);

    const scenarioTotalExpenses =
      fixedMonthlyExpenses +
      scenarioVariableCosts +
      scenarioCardFees;

    const scenarioMonthlyProfit =
      scenarioTotalRevenue - scenarioTotalExpenses;

    const scenarioAnnualProfit = scenarioMonthlyProfit * 12;

    const scenarioProfitMargin =
      scenarioTotalRevenue > 0
        ? (scenarioMonthlyProfit / scenarioTotalRevenue) *
          100
        : 0;

    const scenarioAnnualROI =
      totalInvestment > 0
        ? (scenarioAnnualProfit / totalInvestment) * 100
        : 0;

    return {
      label,
      retailCarsPerDay: scenarioRetailCarsPerDay,
      monthlyRevenue: scenarioTotalRevenue,
      monthlyProfit: scenarioMonthlyProfit,
      annualProfit: scenarioAnnualProfit,
      profitMargin: scenarioProfitMargin,
      annualROI: scenarioAnnualROI,
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
    combinedDownsideScenario,
    combinedUpsideScenario,
    customScenario,
    scenarios,
  };
}
