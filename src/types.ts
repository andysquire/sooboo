export interface Position {
  id: string;
  title: string;
  cost: number;
  children: Position[];
}

export interface ChartDocument {
  version: 1;
  orgName: string;
  targetCost: number;
  root: Position;
}

export interface SaveResult {
  canceled: boolean;
  filePath?: string;
  error?: boolean;
}

export interface OpenResult {
  canceled: boolean;
  filePath?: string;
  data?: ChartDocument;
  error?: boolean;
}

export interface WindowApi {
  saveChart: (data: ChartDocument, filePath?: string | null) => Promise<SaveResult>;
  saveChartAs: (data: ChartDocument) => Promise<SaveResult>;
  openChart: () => Promise<OpenResult>;
  exportCsv: (csv: string, suggestedName?: string) => Promise<SaveResult>;
  setEdited: (isEdited: boolean) => void;
  setTitleFile: (filePath: string) => void;
  onMenuAction: (callback: (channel: string) => void) => () => void;
  onBeforeClose: (callback: () => void) => () => void;
  respondBeforeClose: (hasUnsavedChanges: boolean) => void;
  proceedSaveThenClose: (data: ChartDocument, filePath?: string | null) => Promise<SaveResult>;
  onSaveAndClose: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    api?: WindowApi;
  }
}
