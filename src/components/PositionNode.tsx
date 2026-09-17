import { useEffect, useRef, useState } from "react";
import type { Position } from "../types";
import { totalCost } from "../tree";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

interface PositionNodeProps {
  node: Position;
  isRoot: boolean;
  onRename: (id: string, title: string) => void;
  onCostChange: (id: string, cost: number) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onDeleteWithReports: (id: string) => void;
  onMove: (dragId: string, dropId: string) => void;
  dragOverId: string | null;
  draggingId: string | null;
  setDragOverId: (id: string | null) => void;
  setDraggingId: (id: string | null) => void;
}

export default function PositionNode({
  node,
  isRoot,
  onRename,
  onCostChange,
  onAddChild,
  onDelete,
  onDeleteWithReports,
  onMove,
  dragOverId,
  draggingId,
  setDragOverId,
  setDraggingId,
}: PositionNodeProps) {
  const [titleDraft, setTitleDraft] = useState(node.title);
  const [costDraft, setCostDraft] = useState(String(node.cost));
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => setTitleDraft(node.title), [node.title]);
  useEffect(() => setCostDraft(String(node.cost)), [node.cost]);

  const subtotal = totalCost(node);
  const hasChildren = node.children.length > 0;
  const isDropTarget = dragOverId === node.id && draggingId !== node.id;
  const isBeingDragged = draggingId === node.id;

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    onRename(node.id, trimmed.length > 0 ? trimmed : "Untitled Role");
  };

  const commitCost = () => {
    const parsed = Number(costDraft);
    onCostChange(node.id, Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
  };

  return (
    <li>
      <div
        className={`position-card${isDropTarget ? " drop-target" : ""}${isBeingDragged ? " dragging" : ""}${isRoot ? " root" : ""}`}
        draggable={!isRoot}
        onDragStart={(e) => {
          if (isRoot) return;
          e.dataTransfer.setData("text/plain", node.id);
          e.dataTransfer.effectAllowed = "move";
          setDraggingId(node.id);
        }}
        onDragEnd={() => {
          setDraggingId(null);
          setDragOverId(null);
        }}
        onDragOver={(e) => {
          if (!draggingId || draggingId === node.id) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOverId(node.id);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragOverId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          const draggedId = e.dataTransfer.getData("text/plain");
          if (draggedId) onMove(draggedId, node.id);
          setDragOverId(null);
          setDraggingId(null);
        }}
        title={!isRoot ? "Drag onto another role to move this position in the structure" : undefined}
      >
        <input
          ref={titleRef}
          className="position-title"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") titleRef.current?.blur();
          }}
          aria-label="Role title"
        />
        <label className="position-cost">
          <span className="currency-symbol">£</span>
          <input
            type="number"
            min={0}
            step={500}
            value={costDraft}
            onChange={(e) => setCostDraft(e.target.value)}
            onBlur={commitCost}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            aria-label="Annual employment cost"
          />
        </label>
        {hasChildren && <div className="position-subtotal">Team total: {currency.format(subtotal)}</div>}

        <div className="position-actions">
          <button type="button" className="icon-btn" onClick={() => onAddChild(node.id)} title="Add a reporting role">
            + Add report
          </button>
          {!isRoot && !hasChildren && (
            <button type="button" className="icon-btn danger" onClick={() => onDelete(node.id)} title="Delete this role">
              Delete
            </button>
          )}
          {!isRoot && hasChildren && (
            <>
              <button
                type="button"
                className="icon-btn"
                onClick={() => onDelete(node.id)}
                title="Remove this role; its reports move up to the next manager"
              >
                Remove role
              </button>
              <button
                type="button"
                className="icon-btn danger"
                onClick={() => onDeleteWithReports(node.id)}
                title="Delete this role and everyone reporting into it"
              >
                Delete team
              </button>
            </>
          )}
        </div>
      </div>

      {hasChildren && (
        <ul>
          {node.children.map((child) => (
            <PositionNode
              key={child.id}
              node={child}
              isRoot={false}
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
          ))}
        </ul>
      )}
    </li>
  );
}
