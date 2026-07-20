"use client";

import dynamic from "next/dynamic";

const DeliveryPlanner = dynamic(
  () => import("@/components/delivery/DeliveryPlanner"),
  {
    ssr: false,
    loading: () => (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background:
            "radial-gradient(circle at top, #3b3129 0%, #191613 42%, #0d0c0b 100%)",
          color: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              marginBottom: "14px",
              fontSize: "46px",
            }}
          >
            🗺️
          </div>

          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "28px",
            }}
          >
            Leveransplanering
          </h1>

          <p
            style={{
              margin: 0,
              color: "#cfc5bc",
            }}
          >
            Kartan och beställningarna laddas...
          </p>
        </div>
      </main>
    ),
  },
);

export default function DeliveryPage() {
  return <DeliveryPlanner />;
}