import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Laundromat Profit Calculator | BizToolLab",
  description:
    "Estimate laundromat revenue, expenses, monthly profit, annual profit, profit margin, ROI, and break-even time with this free laundromat profit calculator.",
};

export default function LaundromatCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}