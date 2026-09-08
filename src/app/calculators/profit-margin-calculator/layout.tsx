import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profit Margin Calculator",
  description:
    "Free profit margin calculator. Calculate gross profit, gross profit margin, net profit, net profit margin, and business cost percentages.",
};

export default function ProfitMarginCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}