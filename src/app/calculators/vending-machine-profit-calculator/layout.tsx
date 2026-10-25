import type { Metadata } from "next";
import { publicCanonicalUrl } from "@/lib/publicCanonical";

export const metadata: Metadata = {
  title: "Vending Machine Profit Calculator",
  description:
    "Free vending machine profit calculator. Estimate monthly revenue, product costs, location commissions, operating expenses, profit margin, ROI, and investment payback time.",
  alternates: {
    canonical: publicCanonicalUrl(
      "/calculators/vending-machine-profit-calculator",
    ),
  },
};

export default function VendingMachineProfitCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}