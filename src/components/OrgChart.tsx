import { useRef, useState } from "react";
import type { Label, Position } from "../types";
import PositionNode from "./PositionNode";

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 2;

interface OrgChartProps {
  root: Position;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onRename: (id: string, title: string) => void;
  onCostChange: (id: string, cost: number) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onDeleteWithReports: (id: string) => void;
  onMove: (dragId: string, dropId: string) => void;
  labels: Label[];
  onAssignLabel: (id: string, labelId: string | null) => void;
  onManageLabels: () => void;
}

export default function OrgChart({
  root,
  zoom,
  onZoomChange,
  onRename,
  onCostChange,
  onAddChild,
  onDelete,
  onDeleteWithReports,
  onMove,
  labels,
  onAssignLabel,
  onManageLabels,
}: OrgChartProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const setZoom = (value: number) => onZoomChange(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +value.toFixed(2))));

  const handleFit = () => {
    const canvas = canvasRef.current;
    const content = contentRef.current;
    if (!canvas || !content) return;
    const canvasStyle = getComputedStyle(canvas);
    const padX = parseFloat(canvasStyle.paddingLeft) + parseFloat(canvasStyle.paddingRight);
    const padY = parseFloat(canvasStyle.paddingTop) + parseFloat(canvasStyle.paddingBottom);
    const availableW = canvas.clientWidth - padX;
    const availableH = canvas.clientHeight - padY;
    // Chromium reports scrollWidth/Height on a zoomed element itself in that
    // element's own natural (pre-zoom) coordinate space — no need to divide
    // out the current zoom factor (confirmed empirically: it already matches
    // getBoundingClientRect().width / zoom).
    const naturalW = content.scrollWidth;
    const naturalH = content.scrollHeight;
    if (naturalW <= 0 || naturalH <= 0 || availableW <= 0 || availableH <= 0) return;
    setZoom(Math.min(availableW / naturalW, availableH / naturalH, MAX_ZOOM));
  };

  return (
    <div className="chart-area">
      <div className="chart-canvas" ref={canvasRef}>
        <div className="chart-zoom" ref={contentRef} style={{ zoom }}>
          <ul className="org-tree">
            <PositionNode
              node={root}
              isRoot
              onRename={onRename}
              onCostChange={onCostChange}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onDeleteWithReports={onDeleteWithReports}
              onMove={onMove}
              labels={labels}
              onAssignLabel={onAssignLabel}
              onManageLabels={onManageLabels}
              dragOverId={dragOverId}
              draggingId={draggingId}
              setDragOverId={setDragOverId}
              setDraggingId={setDraggingId}
            />
          </ul>
        </div>
      </div>

      <div className="zoom-controls chart-zoom-controls no-drag">
        <button type="button" onClick={() => setZoom(zoom - 0.1)} title="Zoom out">−</button>
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom(zoom + 0.1)} title="Zoom in">+</button>
        <button type="button" onClick={handleFit} title="Fit the whole structure in view">Fit</button>
        <button type="button" onClick={() => setZoom(1)} title="Reset zoom to 100%">Reset</button>
      </div>
    </div>
  );
}
