import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sikhadenge Build - AI Design & Construction Workspace",
  description:
    "AI workspace for interior renders, exterior elevations, floor plan concepts, BOQ, BBS, client PDFs and contractor packages.",
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
