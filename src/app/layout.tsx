import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://biztoollab.com"),

  title: {
    default: "BizToolLab | Free Business Calculators & Tools",
    template: "%s | BizToolLab",
  },

  description:
    "Free business calculators and practical tools for entrepreneurs and small-business owners. Estimate profits, startup costs, break-even points, ROI, and more.",

  applicationName: "BizToolLab",

  keywords: [
    "business calculators",
    "business tools",
    "small business calculators",
    "profit calculator",
    "startup cost calculator",
    "break even calculator",
    "ROI calculator",
    "entrepreneur tools",
  ],

  authors: [{ name: "BizToolLab" }],
  creator: "BizToolLab",
  publisher: "BizToolLab",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://biztoollab.com",
    siteName: "BizToolLab",
    title: "BizToolLab | Free Business Calculators & Tools",
    description:
      "Free calculators and practical tools to help entrepreneurs and small-business owners make better business decisions.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}