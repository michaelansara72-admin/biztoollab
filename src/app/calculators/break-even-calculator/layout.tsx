import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Break-Even Calculator",
  description:
    "Free break-even calculator. Calculate break-even units, break-even revenue, contribution margin, and the sales required to reach a target profit.",
};

export default function BreakEvenCalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}