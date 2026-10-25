import type { Metadata } from "next";
import { publicCanonicalUrl } from "@/lib/publicCanonical";

export const metadata: Metadata = {
  title: "Laundromat Profit Calculator",
  description:
    "Estimate laundromat revenue, expenses, monthly profit, annual profit, profit margin, ROI, and investment payback with this free laundromat profit calculator.",
  alternates: {
    canonical: publicCanonicalUrl("/calculators/laundromat-profit-calculator"),
  },
};

export default function LaundromatCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}