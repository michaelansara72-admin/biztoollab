import type { Metadata } from "next";
import { publicCanonicalUrl } from "@/lib/publicCanonical";

export const metadata: Metadata = {
  title: "Profit Margin Calculator",
  description:
    "Free profit margin calculator. Calculate gross profit, gross profit margin, operating profit, operating profit margin, and business cost percentages.",
  alternates: {
    canonical: publicCanonicalUrl("/calculators/profit-margin-calculator"),
  },
};

export default function ProfitMarginCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}