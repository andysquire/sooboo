import { useState } from "react";
import type { Position } from "../types";
import PositionNode from "./PositionNode";

interface OrgChartProps {
  root: Position;
  zoom: number;
  onRename: (id: string, title: string) => void;
  onCostChange: (id: string, cost: number) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onDeleteWithReports: (id: string) => void;
  onMove: (dragId: string, dropId: string) => void;
}

export default function OrgChart({
  root,
  zoom,
  onRename,
  onCostChange,
  onAddChild,
  onDelete,
  onDeleteWithReports,
  onMove,
}: OrgChartProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div className="chart-canvas">
      <div className="chart-zoom" style={{ transform: `scale(${zoom})` }}>
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
            dragOverId={dragOverId}
            draggingId={draggingId}
            setDragOverId={setDragOverId}
            setDraggingId={setDraggingId}
          />
        </ul>
      </div>
    </div>
  );
}
