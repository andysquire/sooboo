import { useEffect, useRef, useState } from "react";
import type { Label } from "../types";

interface LabelManagerProps {
  labels: Label[];
  onClose: () => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onRecolor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
}

export default function LabelManager({ labels, onClose, onAdd, onRename, onRecolor, onDelete }: LabelManagerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div className="label-manager no-drag" ref={panelRef}>
      <div className="label-manager-header">
        <span>Labels</span>
        <button type="button" className="icon-btn" onClick={onClose}>Done</button>
      </div>
      {labels.length === 0 && <p className="label-manager-empty">No labels yet. Labels let you colour-code roles — e.g. "Proposed", "At risk", "Confirmed".</p>}
      <ul className="label-manager-list">
        {labels.map((label) => (
          <LabelRow key={label.id} label={label} onRename={onRename} onRecolor={onRecolor} onDelete={onDelete} />
        ))}
      </ul>
      <button type="button" className="icon-btn label-add-btn" onClick={onAdd}>+ Add label</button>
    </div>
  );
}

function LabelRow({
  label,
  onRename,
  onRecolor,
  onDelete,
}: {
  label: Label;
  onRename: (id: string, name: string) => void;
  onRecolor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  const [nameDraft, setNameDraft] = useState(label.name);
  useEffect(() => setNameDraft(label.name), [label.name]);

  return (
    <li className="label-row">
      <input
        type="color"
        className="label-color-input"
        value={label.color}
        onChange={(e) => onRecolor(label.id, e.target.value)}
        aria-label={`Colour for ${label.name || "label"}`}
      />
      <input
        type="text"
        className="label-name-input"
        value={nameDraft}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={() => onRename(label.id, nameDraft.trim() || "Untitled label")}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        aria-label="Label name"
      />
      <button
        type="button"
        className="icon-btn danger"
        onClick={() => window.confirm(`Delete the "${label.name}" label? It will be removed from any roles using it.`) && onDelete(label.id)}
        title="Delete label"
      >
        ×
      </button>
    </li>
  );
}
