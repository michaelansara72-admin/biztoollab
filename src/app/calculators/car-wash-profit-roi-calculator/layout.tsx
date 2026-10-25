import type { Metadata } from "next";
import { publicCanonicalUrl } from "@/lib/publicCanonical";

export const metadata: Metadata = {
  title: "Car Wash Profit & ROI Calculator",
  description:
    "Estimate car wash revenue, operating expenses, monthly and annual profit, profit margin, break-even volume, ROI, and investment payback.",
  alternates: {
    canonical: publicCanonicalUrl("/calculators/car-wash-profit-roi-calculator"),
  },
};

export default function CarWashCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}