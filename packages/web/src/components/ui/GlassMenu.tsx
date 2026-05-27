import React, { useState, useRef, useEffect } from "react";

interface MenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface GlassMenuProps {
  trigger: React.ReactNode;
  items: MenuItem[];
}

export function GlassMenu({ trigger, items }: GlassMenuProps) {
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

  return (
    <div className="model-selector" ref={ref} style={{ display: "inline-block" }}>
      <div onClick={(e) => {
        e.stopPropagation();
        setOpen((v) => !v);
      }}>
        {trigger}
      </div>

      {open && (
        <div className="glass-menu-popover" style={{ top: "100%", right: 0, marginTop: 4 }}>
          {items.map((item, idx) => (
            <button
              key={idx}
              className={`glass-menu-item ${item.danger ? "danger" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
