"use client";

import { useEffect } from "react";

export default function ToolUiStandardizer() {
  useEffect(() => {
    document.body.setAttribute("data-buildsetu-tool-page", "true");

    return () => {
      document.body.removeAttribute("data-buildsetu-tool-page");
    };
  }, []);

  return null;
}
