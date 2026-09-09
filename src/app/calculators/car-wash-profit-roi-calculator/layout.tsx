import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Car Wash Profit & ROI Calculator",
  description:
    "Estimate car wash revenue, operating expenses, monthly and annual profit, profit margin, break-even volume, ROI, and investment payback.",
};

export default function CarWashCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}