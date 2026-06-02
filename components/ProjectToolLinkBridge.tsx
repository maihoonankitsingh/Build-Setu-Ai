"use client";

import { useEffect } from "react";

const STORAGE_KEY = "buildsetu.activeProjectId";

function cleanProjectId(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
}

function getProjectIdFromLocation() {
  if (typeof window === "undefined") return "";

  const url = new URL(window.location.href);
  const fromQuery = cleanProjectId(url.searchParams.get("projectId") || "");

  if (fromQuery) return fromQuery;

  const projectHubMatch = url.pathname.match(/^\/workspace\/project\/([^/?#]+)/);
  if (projectHubMatch?.[1]) return cleanProjectId(decodeURIComponent(projectHubMatch[1]));

  const stored = cleanProjectId(window.localStorage.getItem(STORAGE_KEY) || "");
  return stored;
}

function saveActiveProjectId(projectId: string) {
  if (typeof window === "undefined") return;

  const clean = cleanProjectId(projectId);
  if (!clean) return;

  window.localStorage.setItem(STORAGE_KEY, clean);
  window.dispatchEvent(new CustomEvent("buildsetu-active-project-change", { detail: { projectId: clean } }));
}

function getActiveProjectId() {
  const projectId = getProjectIdFromLocation();
  if (projectId) saveActiveProjectId(projectId);
  return projectId;
}

function shouldAttachProjectId(url: URL) {
  if (typeof window === "undefined") return false;
  if (url.origin !== window.location.origin) return false;
  if (!url.pathname.startsWith("/tools/")) return false;
  if (url.searchParams.get("projectId")) return false;
  return true;
}

function withProjectId(rawHref: string, projectId: string) {
  if (typeof window === "undefined") return rawHref;

  try {
    const url = new URL(rawHref, window.location.origin);

    if (!shouldAttachProjectId(url)) return rawHref;

    url.searchParams.set("projectId", projectId);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return rawHref;
  }
}

function rewriteToolLinks(projectId: string) {
  if (typeof document === "undefined") return;
  if (!projectId) return;

  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/tools/"]'));

  for (const link of links) {
    const href = link.getAttribute("href") || "";
    if (!href) continue;

    const nextHref = withProjectId(href, projectId);
    if (nextHref !== href) {
      link.setAttribute("href", nextHref);
      link.setAttribute("data-buildsetu-project-linked", "1");
    }
  }
}

export default function ProjectToolLinkBridge() {
  useEffect(() => {
    let activeProjectId = getActiveProjectId();

    if (activeProjectId) {
      rewriteToolLinks(activeProjectId);
    }

    function refresh() {
      activeProjectId = getActiveProjectId();
      if (activeProjectId) rewriteToolLinks(activeProjectId);
    }

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;

      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";
      if (!href || !href.includes("/tools/")) return;

      const projectId = getActiveProjectId();
      if (!projectId) return;

      const nextHref = withProjectId(href, projectId);
      if (nextHref === href) return;

      event.preventDefault();
      anchor.setAttribute("href", nextHref);
      window.location.href = nextHref;
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", refresh);
    window.addEventListener("buildsetu-active-project-change", refresh as EventListener);

    const observer = new MutationObserver(() => {
      const projectId = getActiveProjectId();
      if (projectId) rewriteToolLinks(projectId);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });

    const timer = window.setInterval(refresh, 1500);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", refresh);
      window.removeEventListener("buildsetu-active-project-change", refresh as EventListener);
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
