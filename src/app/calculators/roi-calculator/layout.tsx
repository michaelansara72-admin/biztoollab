import type { Metadata } from "next";
import { publicCanonicalUrl } from "@/lib/publicCanonical";

export const metadata: Metadata = {
  title: "ROI Calculator",
  description:
    "Free ROI calculator. Calculate return on investment, net profit, return multiple, and annualized return based on your investment and total return.",
  alternates: {
    canonical: publicCanonicalUrl("/calculators/roi-calculator"),
  },
};

export default function RoiCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}