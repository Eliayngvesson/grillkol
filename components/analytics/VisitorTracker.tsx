"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_STORAGE_KEY =
  "grillkol_visitor_id";

const LAST_TRACKED_KEY =
  "grillkol_last_tracked_page";

const MINIMUM_TRACKING_INTERVAL =
  30 * 60 * 1000;

function createVisitorId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

function getVisitorId() {
  const existingVisitorId =
    window.localStorage.getItem(
      VISITOR_STORAGE_KEY,
    );

  if (existingVisitorId) {
    return existingVisitorId;
  }

  const newVisitorId = createVisitorId();

  window.localStorage.setItem(
    VISITOR_STORAGE_KEY,
    newVisitorId,
  );

  return newVisitorId;
}

function shouldTrackPage(pathname: string) {
  if (pathname.startsWith("/admin")) {
    return false;
  }

  const storedValue =
    window.sessionStorage.getItem(
      LAST_TRACKED_KEY,
    );

  if (!storedValue) {
    return true;
  }

  try {
    const previous = JSON.parse(
      storedValue,
    ) as {
      path?: string;
      trackedAt?: number;
    };

    const samePage =
      previous.path === pathname;

    const recentlyTracked =
      typeof previous.trackedAt ===
        "number" &&
      Date.now() - previous.trackedAt <
        MINIMUM_TRACKING_INTERVAL;

    return !(
      samePage && recentlyTracked
    );
  } catch {
    return true;
  }
}

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    if (!shouldTrackPage(pathname)) {
      return;
    }

    const visitorId = getVisitorId();

    window.sessionStorage.setItem(
      LAST_TRACKED_KEY,
      JSON.stringify({
        path: pathname,
        trackedAt: Date.now(),
      }),
    );

    void fetch("/api/analytics/visit", {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        visitorId,
        path: pathname,
      }),

      keepalive: true,
    }).catch((error) => {
      console.error(
        "Kunde inte registrera besöket:",
        error,
      );
    });
  }, [pathname]);

  return null;
}