import type { Metadata } from "next";
import { publicCanonicalUrl } from "@/lib/publicCanonical";

export const metadata: Metadata = {
  title: "Break-Even Calculator",
  description:
    "Free break-even calculator. Calculate break-even units, break-even revenue, contribution margin, and the sales required to reach a target profit.",
  alternates: {
    canonical: publicCanonicalUrl("/calculators/break-even-calculator"),
  },
};

export default function BreakEvenCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}