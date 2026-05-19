import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});



function BuildSetuThemeInitScript() {
  const code = `
(function () {
  try {
    var stored = localStorage.getItem("buildsetu-theme-mode") || "light";
    var mode = ["light", "dark", "system"].indexOf(stored) >= 0 ? stored : "light";
    var resolved = mode;

    if (mode === "system") {
      resolved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    document.documentElement.dataset.buildsetuThemeMode = mode;
    document.documentElement.dataset.buildsetuTheme = resolved;
    document.documentElement.classList.toggle("theme-dark", resolved === "dark");
    document.documentElement.classList.toggle("theme-light", resolved === "light");

    window.__buildsetuSetTheme = function (nextMode) {
      var safe = ["light", "dark", "system"].indexOf(nextMode) >= 0 ? nextMode : "light";
      var nextResolved = safe;

      if (safe === "system") {
        nextResolved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }

      localStorage.setItem("buildsetu-theme-mode", safe);
      document.documentElement.dataset.buildsetuThemeMode = safe;
      document.documentElement.dataset.buildsetuTheme = nextResolved;
      document.documentElement.classList.toggle("theme-dark", nextResolved === "dark");
      document.documentElement.classList.toggle("theme-light", nextResolved === "light");
    };
  } catch (e) {}
})();
`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}


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
    <html suppressHydrationWarning lang="en">
      <body className={`${plusJakarta.variable}`}>
        <BuildSetuThemeInitScript />{children}</body>
    </html>
  );
}
