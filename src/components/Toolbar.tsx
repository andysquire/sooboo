import { useEffect, useState } from "react";
import type { Label } from "../types";
import LabelManager from "./LabelManager";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

interface ToolbarProps {
  orgName: string;
  onOrgNameChange: (name: string) => void;
  total: number;
  targetCost: number;
  onTargetChange: (value: number) => void;
  filePath: string | null;
  isDirty: boolean;
  statusMessage: string | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportCsv: () => void;
  labels: Label[];
  showLabelManager: boolean;
  onToggleLabelManager: () => void;
  onCloseLabelManager: () => void;
  onAddLabel: () => void;
  onRenameLabel: (id: string, name: string) => void;
  onRecolorLabel: (id: string, color: string) => void;
  onDeleteLabel: (id: string) => void;
}

export default function Toolbar({
  orgName,
  onOrgNameChange,
  total,
  targetCost,
  onTargetChange,
  filePath,
  isDirty,
  statusMessage,
  zoom,
  onZoomChange,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExportCsv,
  labels,
  showLabelManager,
  onToggleLabelManager,
  onCloseLabelManager,
  onAddLabel,
  onRenameLabel,
  onRecolorLabel,
  onDeleteLabel,
}: ToolbarProps) {
  const [nameDraft, setNameDraft] = useState(orgName);
  const [targetDraft, setTargetDraft] = useState(String(targetCost));

  useEffect(() => setNameDraft(orgName), [orgName]);
  useEffect(() => setTargetDraft(String(targetCost)), [targetCost]);

  const variance = total - targetCost;
  const variancePct = targetCost > 0 ? (variance / targetCost) * 100 : 0;
  const varianceLabel =
    variance === 0
      ? "On target"
      : variance > 0
        ? `${currency.format(variance)} over target`
        : `${currency.format(Math.abs(variance))} under target`;
  const varianceClass = variance === 0 ? "on-target" : variance > 0 ? "over-target" : "under-target";

  const fileLabel = filePath ? filePath.split("/").pop() : "Unsaved chart";

  return (
    <div className="toolbar">
      <div className="toolbar-row toolbar-row-drag">
        <div className="toolbar-titles">
          <input
            className="org-name-input"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => onOrgNameChange(nameDraft.trim() || "Untitled Team Structure")}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label="Structure name"
          />
          <span className="file-status">
            {fileLabel}
            {isDirty ? " • Edited" : ""}
            {statusMessage ? ` — ${statusMessage}` : ""}
          </span>
        </div>

        <div className="toolbar-actions no-drag">
          <button type="button" onClick={onNew}>New</button>
          <button type="button" onClick={onOpen}>Open…</button>
          <button type="button" onClick={onSave}>Save</button>
          <button type="button" onClick={onSaveAs}>Save As…</button>
          <button type="button" onClick={onExportCsv}>Export CSV</button>
          <div className="label-manager-anchor">
            <button type="button" onClick={onToggleLabelManager}>Labels</button>
            {showLabelManager && (
              <LabelManager
                labels={labels}
                onClose={onCloseLabelManager}
                onAdd={onAddLabel}
                onRename={onRenameLabel}
                onRecolor={onRecolorLabel}
                onDelete={onDeleteLabel}
              />
            )}
          </div>
        </div>
      </div>

      <div className="toolbar-row no-drag">
        <div className="metric">
          <span className="metric-label">Total structure cost</span>
          <span className="metric-value">{currency.format(total)}</span>
        </div>

        <div className="metric target-input">
          <label className="metric-label" htmlFor="target-cost">Target cost</label>
          <div className="target-input-field">
            <span className="currency-symbol">£</span>
            <input
              id="target-cost"
              type="number"
              min={0}
              step={1000}
              value={targetDraft}
              onChange={(e) => setTargetDraft(e.target.value)}
              onBlur={() => {
                const parsed = Number(targetDraft);
                onTargetChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          </div>
        </div>

        <div className={`metric variance ${varianceClass}`}>
          <span className="metric-label">Variance</span>
          <span className="metric-value">
            {varianceLabel}
            {targetCost > 0 && ` (${variance >= 0 ? "+" : ""}${variancePct.toFixed(1)}%)`}
          </span>
        </div>

        <div className="zoom-controls">
          <button type="button" onClick={() => onZoomChange(Math.max(0.5, +(zoom - 0.1).toFixed(2)))} title="Zoom out">−</button>
          <span className="zoom-value">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => onZoomChange(Math.min(1.5, +(zoom + 0.1).toFixed(2)))} title="Zoom in">+</button>
          <button type="button" onClick={() => onZoomChange(1)} title="Reset zoom">Reset</button>
        </div>
      </div>
    </div>
  );
}
