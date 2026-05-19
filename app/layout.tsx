import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sikhadenge Build - AI Design & Construction Workspace",
  description:
    "AI tools for interior design, exterior elevation, floor plans, BOQ, BBS, working drawings, client PDFs and contractor packages.",
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
