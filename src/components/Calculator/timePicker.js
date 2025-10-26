import React, { useEffect, useRef, useState } from "react";
import "./timePicker.css";

const pad = (n) => String(n).padStart(2, "0");

const parseInitial = (initial) => {
  if (!initial || typeof initial !== "string")
    return { hh: 0, mm: 0, has: false };
  const parts = initial.split(":").map((p) => Number(p));
  if (parts.length !== 2 || parts.some((v) => Number.isNaN(v)))
    return { hh: 0, mm: 0, has: false };
  return {
    hh: ((parts[0] % 24) + 24) % 24,
    mm: ((parts[1] % 60) + 60) % 60,
    has: true,
  };
};

const TimePicker = ({
  isVisible,
  initialTime = "",
  onClose,
  onSave,
  onDelete,
}) => {
  const overlayRef = useRef(null);
  const [hh, setHh] = useState(0);
  const [mm, setMm] = useState(0);
  const [hasInitial, setHasInitial] = useState(false);

  // sync when opened or initialTime changes
  useEffect(() => {
    const parsed = parseInitial(initialTime);
    if (parsed.has) {
      setHh(parsed.hh);
      setMm(parsed.mm);
      setHasInitial(true);
    } else {
      const now = new Date();
      setHh(now.getHours());
      setMm(now.getMinutes());
      setHasInitial(false);
    }
  }, [initialTime, isVisible]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose && onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!isVisible) return null;

  const incH = () => setHh((v) => (v + 1) % 24);
  const decH = () => setHh((v) => (v - 1 + 24) % 24);
  const incM = () => setMm((v) => (v + 1) % 60);
  const decM = () => setMm((v) => (v - 1 + 60) % 60);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      // only close, do NOT save
      onClose && onClose();
    }
  };

  const handleSave = () => {
    const out = `${pad(hh)}:${pad(mm)}`;
    onSave && onSave(out);
  };

  const handleDelete = () => {
    onDelete && onDelete();
  };

  return (
    <div
      className="timepicker-overlay tp-overlay"
      ref={overlayRef}
      onMouseDown={handleOverlayClick}
    >
      <div
        className="timepicker-container tp-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="tp-header">
          <h3>Log ATO time</h3>
        </div>

        <div className="tp-body">
          <div className="timepicker-display">
            <div className="time-column">
              <button className="tp-arrow" onClick={incH} aria-label="Hour up">
                ▲
              </button>
              <div className="tp-value" aria-live="polite">
                {pad(hh)}
              </div>
              <button
                className="tp-arrow"
                onClick={decH}
                aria-label="Hour down"
              >
                ▼
              </button>
              <div className="tp-label">Hour</div>
            </div>

            <div className="colon">:</div>

            <div className="time-column">
              <button
                className="tp-arrow"
                onClick={incM}
                aria-label="Minute up"
              >
                ▲
              </button>
              <div className="tp-value" aria-live="polite">
                {pad(mm)}
              </div>
              <button
                className="tp-arrow"
                onClick={decM}
                aria-label="Minute down"
              >
                ▼
              </button>
              <div className="tp-label">Min</div>
            </div>
          </div>
        </div>

        <div className="tp-actions">
          <button className="tp-btn tp-save" onClick={handleSave}>
            Log time
          </button>
          <button
            className="tp-btn tp-delete"
            onClick={handleDelete}
            disabled={!hasInitial}
            title={
              !hasInitial ? "No logged time to delete" : "Delete logged time"
            }
          >
            Delete Log
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimePicker;
