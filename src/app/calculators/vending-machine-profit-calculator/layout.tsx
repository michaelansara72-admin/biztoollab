import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vending Machine Profit Calculator",
  description:
    "Free vending machine profit calculator. Estimate monthly revenue, product costs, location commissions, operating expenses, profit margin, ROI, and investment payback time.",
};

export default function VendingMachineProfitCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}