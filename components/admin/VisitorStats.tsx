"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import styles from "./VisitorStats.module.css";

type VisitorStatistics = {
  visitorsToday: number;
  visitorsLast7Days: number;
  visitorsTotal: number;
  pageViewsToday: number;
  pageViewsTotal: number;
};

const EMPTY_STATISTICS: VisitorStatistics = {
  visitorsToday: 0,
  visitorsLast7Days: 0,
  visitorsTotal: 0,
  pageViewsToday: 0,
  pageViewsTotal: 0,
};

export default function VisitorStats() {
  const [statistics, setStatistics] =
    useState<VisitorStatistics>(
      EMPTY_STATISTICS,
    );

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadStatistics =
    useCallback(async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          "/api/analytics/visit",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as
            | VisitorStatistics
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            "error" in result
              ? result.error
              : "Statistiken kunde inte hämtas.",
          );
        }

        setStatistics(
          result as VisitorStatistics,
        );
      } catch (error) {
        console.error(error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Statistiken kunde inte hämtas.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadStatistics();

    const intervalId =
      window.setInterval(() => {
        void loadStatistics();
      }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadStatistics]);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            Besöksstatistik
          </span>

          <h2>Besökare på hemsidan</h2>

          <p>
            Statistiken uppdateras
            automatiskt varje minut.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadStatistics()
          }
          disabled={loading}
          className={styles.refreshButton}
        >
          {loading
            ? "Uppdaterar..."
            : "Uppdatera"}
        </button>
      </div>

      {errorMessage && (
        <div className={styles.error}>
          {errorMessage}
        </div>
      )}

      <div className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.icon}>
            👥
          </div>

          <span>Besökare idag</span>

          <strong>
            {loading
              ? "–"
              : statistics.visitorsToday}
          </strong>
        </article>

        <article className={styles.card}>
          <div className={styles.icon}>
            📅
          </div>

          <span>Senaste 7 dagarna</span>

          <strong>
            {loading
              ? "–"
              : statistics.visitorsLast7Days}
          </strong>
        </article>

        <article className={styles.card}>
          <div className={styles.icon}>
            🌍
          </div>

          <span>Totalt antal besökare</span>

          <strong>
            {loading
              ? "–"
              : statistics.visitorsTotal}
          </strong>
        </article>

        <article className={styles.card}>
          <div className={styles.icon}>
            👀
          </div>

          <span>Sidvisningar idag</span>

          <strong>
            {loading
              ? "–"
              : statistics.pageViewsToday}
          </strong>
        </article>
      </div>
    </section>
  );
}