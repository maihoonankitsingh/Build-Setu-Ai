import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});


export const metadata: Metadata = {
  title: "BuildSetu AI - Plans, Interiors, BOQ, BBS and Client Documents",
  description:
    "BuildSetu AI is an AI workspace for floor plans, interior renders, exterior elevations, BOQ, BBS, client agreements, PDFs and contractor documentation. Powered by Sikhadenge.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable}`}>{children}</body>
    </html>
  );
}
