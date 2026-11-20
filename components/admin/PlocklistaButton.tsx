"use client";

import { useRouter } from "next/navigation";

type PlocklistaButtonProps = {
  className?: string;
};

export default function PlocklistaButton({
  className = "",
}: PlocklistaButtonProps) {
  const router = useRouter();

  function openPickingList() {
    router.push("/admin/plocklista");
  }

  return (
    <button
      type="button"
      className={`plocklista-button ${className}`}
      onClick={openPickingList}
      aria-label="Öppna plocklistan"
    >
      <span className="plocklista-button__icon" aria-hidden="true">
        📦
      </span>

      <span className="plocklista-button__text">
        <strong>Öppna plocklista</strong>
        <small>Summera allt som ska lastas</small>
      </span>

      <span className="plocklista-button__arrow" aria-hidden="true">
        →
      </span>

      <style jsx>{`
        .plocklista-button {
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          min-height: 58px;
          padding: 10px 16px;
          color: #ffffff;
          background: #263d26;
          border: 1px solid #263d26;
          border-radius: 14px;
          box-shadow: 0 8px 22px rgba(38, 61, 38, 0.2);
          font: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            background 0.15s ease;
        }

        .plocklista-button:hover {
          background: #1e321e;
          box-shadow: 0 12px 28px rgba(38, 61, 38, 0.28);
          transform: translateY(-1px);
        }

        .plocklista-button:active {
          box-shadow: 0 5px 14px rgba(38, 61, 38, 0.2);
          transform: translateY(0);
        }

        .plocklista-button:focus-visible {
          outline: 3px solid rgba(245, 158, 11, 0.5);
          outline-offset: 3px;
        }

        .plocklista-button__icon {
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          width: 38px;
          height: 38px;
          background: rgba(255, 255, 255, 0.13);
          border-radius: 10px;
          font-size: 20px;
        }

        .plocklista-button__text {
          display: grid;
          flex: 1;
          gap: 2px;
        }

        .plocklista-button__text strong {
          font-size: 14px;
          line-height: 1.2;
        }

        .plocklista-button__text small {
          color: rgba(255, 255, 255, 0.72);
          font-size: 11px;
          line-height: 1.3;
        }

        .plocklista-button__arrow {
          flex: 0 0 auto;
          font-size: 21px;
          font-weight: 800;
        }

        @media (max-width: 600px) {
          .plocklista-button {
            width: 100%;
          }
        }
      `}</style>
    </button>
  );
}