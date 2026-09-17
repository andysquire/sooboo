import { useCallback, useEffect, useRef, useState } from "react";
import type { ChartDocument, Position } from "./types";
import {
  addChild,
  createDefaultChart,
  createPosition,
  deletePosition,
  deletePositionWithChildren,
  findNode,
  moveNode,
  toCsvRows,
  totalCost,
} from "./tree";
import Toolbar from "./components/Toolbar";
import OrgChart from "./components/OrgChart";
import "./App.css";

const DOCUMENT_VERSION = 1 as const;

function toCsv(root: Position): string {
  const header = ["Level", "Role", "Reports To", "Annual Cost (GBP)"];
  const rows = toCsvRows(root);
  const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

export default function App() {
  const [orgName, setOrgName] = useState("SUBU Team Structure");
  const [root, setRoot] = useState<Position>(() => createDefaultChart());
  const [targetCost, setTargetCost] = useState<number>(280000);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Keep the latest state in refs so IPC callbacks (registered once) always
  // see current values without re-subscribing on every change.
  const stateRef = useRef({ orgName, root, targetCost, filePath, isDirty });
  stateRef.current = { orgName, root, targetCost, filePath, isDirty };

  const markDirty = useCallback(() => setIsDirty(true), []);

  useEffect(() => {
    window.api?.setEdited(isDirty);
  }, [isDirty]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const currentDocument = useCallback((): ChartDocument => {
    const s = stateRef.current;
    return { version: DOCUMENT_VERSION, orgName: s.orgName, targetCost: s.targetCost, root: s.root };
  }, []);

  const applyOpenedDocument = useCallback((data: ChartDocument, path: string | null) => {
    setOrgName(data.orgName ?? "Untitled Team Structure");
    setRoot(data.root);
    setTargetCost(data.targetCost ?? 0);
    setFilePath(path);
    setIsDirty(false);
  }, []);

  const handleNewChart = useCallback(() => {
    if (stateRef.current.isDirty) {
      const proceed = window.confirm(
        "Start a new chart? Any unsaved changes to the current structure will be lost."
      );
      if (!proceed) return;
    }
    setOrgName("New Team Structure");
    setRoot(createPosition("New Role", 0));
    setTargetCost(0);
    setFilePath(null);
    setIsDirty(false);
    setStatusMessage("Started a new chart");
  }, []);

  const handleOpen = useCallback(async () => {
    if (!window.api) return;
    const result = await window.api.openChart();
    if (result.canceled || !result.data) return;
    applyOpenedDocument(result.data, result.filePath ?? null);
    setStatusMessage(`Opened ${result.filePath ?? "chart"}`);
  }, [applyOpenedDocument]);

  const handleSave = useCallback(async () => {
    if (!window.api) return;
    const result = await window.api.saveChart(currentDocument(), stateRef.current.filePath);
    if (result.canceled) return;
    if (result.filePath) {
      setFilePath(result.filePath);
      setIsDirty(false);
      setStatusMessage(`Saved ${result.filePath}`);
    }
  }, [currentDocument]);

  const handleSaveAs = useCallback(async () => {
    if (!window.api) return;
    const result = await window.api.saveChartAs(currentDocument());
    if (result.canceled) return;
    if (result.filePath) {
      setFilePath(result.filePath);
      setIsDirty(false);
      setStatusMessage(`Saved ${result.filePath}`);
    }
  }, [currentDocument]);

  const handleExportCsv = useCallback(async () => {
    if (!window.api) return;
    const csv = toCsv(stateRef.current.root);
    const suggested = `${stateRef.current.orgName || "SUBU Org Chart"}.csv`;
    const result = await window.api.exportCsv(csv, suggested);
    if (!result.canceled && result.filePath) setStatusMessage(`Exported ${result.filePath}`);
  }, []);

  // Wire up native menu actions and the unsaved-changes close guard once.
  useEffect(() => {
    const offMenu = window.api?.onMenuAction((channel) => {
      switch (channel) {
        case "menu:new-chart":
          handleNewChart();
          break;
        case "menu:open-chart":
          handleOpen();
          break;
        case "menu:save-chart":
          handleSave();
          break;
        case "menu:save-chart-as":
          handleSaveAs();
          break;
        case "menu:export-csv":
          handleExportCsv();
          break;
      }
    });
    const offBeforeClose = window.api?.onBeforeClose(() => {
      window.api?.respondBeforeClose(stateRef.current.isDirty);
    });
    const offSaveAndClose = window.api?.onSaveAndClose(() => {
      window.api?.proceedSaveThenClose(currentDocument(), stateRef.current.filePath);
    });
    return () => {
      offMenu?.();
      offBeforeClose?.();
      offSaveAndClose?.();
    };
  }, [handleNewChart, handleOpen, handleSave, handleSaveAs, handleExportCsv, currentDocument]);

  const handleRename = useCallback(
    (id: string, title: string) => {
      setRoot((prev) => updateTitle(prev, id, title));
      markDirty();
    },
    [markDirty]
  );

  const handleCostChange = useCallback(
    (id: string, cost: number) => {
      setRoot((prev) => updateCost(prev, id, cost));
      markDirty();
    },
    [markDirty]
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      setRoot((prev) => addChild(prev, parentId, createPosition("New Role", 0)));
      markDirty();
    },
    [markDirty]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const node = findNode(stateRef.current.root, id);
      if (!node) return;
      if (node.children.length > 0) {
        const promote = window.confirm(
          `"${node.title}" has ${node.children.length} direct report${node.children.length === 1 ? "" : "s"}.\n\nClick OK to delete this role and move its reports up to the next manager.\nClick Cancel to keep this role.`
        );
        if (!promote) return;
        setRoot((prev) => deletePosition(prev, id));
      } else {
        setRoot((prev) => deletePositionWithChildren(prev, id));
      }
      markDirty();
    },
    [markDirty]
  );

  const handleDeleteWithReports = useCallback(
    (id: string) => {
      const node = findNode(stateRef.current.root, id);
      if (!node) return;
      const count = countAll(node) - 1;
      const proceed = window.confirm(
        count > 0
          ? `Delete "${node.title}" and all ${count} role(s) reporting into it? This can't be undone.`
          : `Delete "${node.title}"?`
      );
      if (!proceed) return;
      setRoot((prev) => deletePositionWithChildren(prev, id));
      markDirty();
    },
    [markDirty]
  );

  const handleMove = useCallback(
    (dragId: string, dropId: string) => {
      setRoot((prev) => {
        const next = moveNode(prev, dragId, dropId);
        if (next !== prev) markDirty();
        return next;
      });
    },
    [markDirty]
  );

  const handleOrgNameChange = useCallback(
    (name: string) => {
      setOrgName(name);
      markDirty();
    },
    [markDirty]
  );

  const handleTargetChange = useCallback(
    (value: number) => {
      setTargetCost(value);
      markDirty();
    },
    [markDirty]
  );

  const total = totalCost(root);

  return (
    <div className="app">
      <Toolbar
        orgName={orgName}
        onOrgNameChange={handleOrgNameChange}
        total={total}
        targetCost={targetCost}
        onTargetChange={handleTargetChange}
        filePath={filePath}
        isDirty={isDirty}
        statusMessage={statusMessage}
        zoom={zoom}
        onZoomChange={setZoom}
        onNew={handleNewChart}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExportCsv={handleExportCsv}
      />
      <OrgChart
        root={root}
        zoom={zoom}
        onRename={handleRename}
        onCostChange={handleCostChange}
        onAddChild={handleAddChild}
        onDelete={handleDelete}
        onDeleteWithReports={handleDeleteWithReports}
        onMove={handleMove}
      />
    </div>
  );
}

function updateTitle(node: Position, id: string, title: string): Position {
  if (node.id === id) return { ...node, title };
  return { ...node, children: node.children.map((c) => updateTitle(c, id, title)) };
}

function updateCost(node: Position, id: string, cost: number): Position {
  if (node.id === id) return { ...node, cost };
  return { ...node, children: node.children.map((c) => updateCost(c, id, cost)) };
}

function countAll(node: Position): number {
  return 1 + node.children.reduce((sum, c) => sum + countAll(c), 0);
}
