import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Startup Cost Calculator",
  description:
    "Free startup cost calculator. Estimate one-time startup expenses, monthly operating costs, cash reserves, contingency funds, and total capital needed to launch a business.",
};

export default function StartupCostCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}