import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
