export type LaundromatProfitInput = {
  washers: number;
  dryers: number;
  washPrice: number;
  dryPrice: number;
  washerTurns: number;
  dryerTurns: number;
  daysOpen: number;
  washFoldRevenue: number;
  vendingRevenue: number;
  otherRevenue: number;
  rent: number;
  utilities: number;
  labor: number;
  maintenance: number;
  insurance: number;
  otherExpenses: number;
  processingRate: number;
  monthlyLoanPayment: number;
  startupInvestment: number;
};

export type LaundromatProfitResult = {
  washerRevenue: number;
  dryerRevenue: number;
  machineRevenue: number;
  ancillaryRevenue: number;
  monthlyRevenue: number;
  processingFees: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  annualProfit: number;
  profitMargin: number;
  annualROI: number;
  breakEvenMonths: number | null;
  breakEvenYears: number | null;
};

export const defaultLaundromatProfitInput: LaundromatProfitInput = {
  washers: 30,
  dryers: 24,
  washPrice: 3.5,
  dryPrice: 2.25,
  washerTurns: 4,
  dryerTurns: 4,
  daysOpen: 30,
  washFoldRevenue: 0,
  vendingRevenue: 0,
  otherRevenue: 0,
  rent: 5000,
  utilities: 4200,
  labor: 2500,
  maintenance: 1000,
  insurance: 400,
  otherExpenses: 500,
  processingRate: 3,
  monthlyLoanPayment: 0,
  startupInvestment: 300000,
};

export const illustrativeLaundromatExampleInput: LaundromatProfitInput = {
  ...defaultLaundromatProfitInput,
  washers: 20,
  dryers: 20,
  washPrice: 4,
  dryPrice: 3,
  washerTurns: 4.5,
  dryerTurns: 4.5,
  daysOpen: 30,
  washFoldRevenue: 0,
  vendingRevenue: 0,
  otherRevenue: 0,
  rent: 0,
  utilities: 0,
  labor: 0,
  maintenance: 0,
  insurance: 0,
  otherExpenses: 0,
  processingRate: 0,
  monthlyLoanPayment: 0,
  startupInvestment: 0,
};

export const illustrativeLaundromatLowerTurnsInput: LaundromatProfitInput = {
  ...illustrativeLaundromatExampleInput,
  washerTurns: 3.5,
  dryerTurns: 3.5,
};

/**
 * Monthly machine revenue is count × daily turns × price × days open.
 * Processing fees are the entered rate applied to total monthly revenue.
 * Monthly profit subtracts the entered operating costs, those fees, and
 * the entered loan payment. Payback is blank when monthly profit is not
 * positive.
 */
export function calculateLaundromatProfit(
  input: LaundromatProfitInput
): LaundromatProfitResult {
  const washerRevenue =
    input.washers * input.washerTurns * input.washPrice * input.daysOpen;

  const dryerRevenue =
    input.dryers * input.dryerTurns * input.dryPrice * input.daysOpen;

  const machineRevenue = washerRevenue + dryerRevenue;

  const ancillaryRevenue =
    input.washFoldRevenue + input.vendingRevenue + input.otherRevenue;

  const monthlyRevenue = machineRevenue + ancillaryRevenue;

  const processingFees = monthlyRevenue * (input.processingRate / 100);

  const monthlyExpenses =
    input.rent +
    input.utilities +
    input.labor +
    input.maintenance +
    input.insurance +
    input.otherExpenses +
    processingFees +
    input.monthlyLoanPayment;

  const monthlyProfit = monthlyRevenue - monthlyExpenses;

  const annualProfit = monthlyProfit * 12;

  const profitMargin =
    monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

  const annualROI =
    input.startupInvestment > 0
      ? (annualProfit / input.startupInvestment) * 100
      : 0;

  const breakEvenMonths =
    monthlyProfit > 0 ? input.startupInvestment / monthlyProfit : null;

  const breakEvenYears =
    breakEvenMonths !== null ? breakEvenMonths / 12 : null;

  return {
    washerRevenue,
    dryerRevenue,
    machineRevenue,
    ancillaryRevenue,
    monthlyRevenue,
    processingFees,
    monthlyExpenses,
    monthlyProfit,
    annualProfit,
    profitMargin,
    annualROI,
    breakEvenMonths,
    breakEvenYears,
  };
}

export function revenuePerMachine(
  machineCount: number,
  machineRevenue: number
) {
  if (machineCount <= 0) {
    return null;
  }

  return machineRevenue / machineCount;
}

export const illustrativeLaundromatExample = calculateLaundromatProfit(
  illustrativeLaundromatExampleInput
);

export const illustrativeLaundromatLowerTurns = calculateLaundromatProfit(
  illustrativeLaundromatLowerTurnsInput
);
