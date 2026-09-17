import { useEffect, useRef, useState } from "react";
import type { Label } from "../types";
import { readableTextColor } from "../labels";

interface LabelPickerProps {
  labels: Label[];
  currentLabelId: string | null | undefined;
  onAssign: (labelId: string | null) => void;
  onManageLabels: () => void;
}

export default function LabelPicker({ labels, currentLabelId, onAssign, onManageLabels }: LabelPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = labels.find((l) => l.id === currentLabelId) ?? null;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="label-picker" ref={ref}>
      <button
        type="button"
        className="label-chip-btn"
        style={current ? { background: current.color, color: readableTextColor(current.color) } : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {current ? current.name : "+ Label"}
      </button>
      {open && (
        <div className="label-dropdown">
          <button type="button" className="label-dropdown-item" onClick={() => { onAssign(null); setOpen(false); }}>
            <span className="label-swatch none" /> No label
          </button>
          {labels.map((label) => (
            <button
              key={label.id}
              type="button"
              className={`label-dropdown-item${label.id === currentLabelId ? " active" : ""}`}
              onClick={() => { onAssign(label.id); setOpen(false); }}
            >
              <span className="label-swatch" style={{ background: label.color }} /> {label.name}
            </button>
          ))}
          <div className="label-dropdown-divider" />
          <button
            type="button"
            className="label-dropdown-item manage"
            onClick={() => { setOpen(false); onManageLabels(); }}
          >
            Manage labels…
          </button>
        </div>
      )}
    </div>
  );
}
