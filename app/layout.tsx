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
  icons: { icon: "/favicon.ico", shortcut: "/favicon.ico", apple: "/favicon.ico" },
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
        <BuildSetuThemeInitScript />{children}
              <script src="/buildsetu-live-credits.js?v=20260527_124558" defer />
              <script src="/buildsetu-right-llm-chat.js?v=20260528_224520" defer />
              <script src="/buildsetu-recent-projects-final.js?v=20260527_171307" defer />
              <script src="/buildsetu-login-transparent-logo.js?v=20260528_124413" defer />
              <script src="/buildsetu-chat-logo-force.js?v=20260528_213942" defer />
              <script src="/buildsetu-chat-scrollbar-hide.js?v=20260528_214753" defer />
              <script src="/buildsetu-chat-gpt-connector.js?v=20260529_133757" defer />
              <script src="/buildsetu-hide-newproject-right-widget.js" defer></script>
            </body>
    </html>
  );
}
