import type { Metadata } from "next";
import { publicCanonicalUrl } from "@/lib/publicCanonical";

export const metadata: Metadata = {
  title: "Startup Cost Calculator",
  description:
    "Free startup cost calculator. Estimate one-time startup expenses, monthly operating costs, cash reserves, contingency funds, and total capital needed to launch a business.",
  alternates: {
    canonical: publicCanonicalUrl("/calculators/startup-cost-calculator"),
  },
};

export default function StartupCostCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}