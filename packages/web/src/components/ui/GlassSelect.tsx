import React, { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export function GlassSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
}: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div
      className={`model-selector ${className}`}
      ref={ref}
      style={{ width: "100%" }}
    >
      <button
        className="glass-select-trigger"
        data-state={open ? "open" : "closed"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="glass-select-value">
          {selectedOption ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {selectedOption.icon} {selectedOption.label}
            </span>
          ) : (
            <span style={{ opacity: 0.5 }}>{placeholder}</span>
          )}
        </span>
        <svg
          className="glass-select-icon"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {open && (
        <div
          className="glass-menu-popover"
          style={{
            bottom: "auto",
            top: "100%",
            marginTop: 4,
            width: "100%",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              disabled={opt.disabled}
              className="glass-menu-item"
              style={{
                opacity: opt.disabled ? 0.5 : 1,
                cursor: opt.disabled ? "not-allowed" : "pointer",
                background: opt.value === value ? "rgba(184, 195, 255, 0.12)" : "",
                color: opt.value === value ? "var(--primary)" : "",
              }}
              onClick={() => {
                if (!opt.disabled) {
                  onChange(opt.value);
                  setOpen(false);
                }
              }}
            >
              {opt.icon}
              <span style={{ flex: 1 }}>{opt.label}</span>
              {opt.value === value && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
