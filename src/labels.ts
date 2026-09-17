import type { Label } from "./types";
import { makeId } from "./tree";

// A palette that stays legible with dark text on top (used for new-label
// swatch cycling); users can still pick any custom colour afterwards.
export const LABEL_PALETTE = [
  "#f2a154", // proposed / amber
  "#e2637a", // at risk / rose
  "#5fb08a", // confirmed / green
  "#5b8fd6", // under review / blue
  "#a06bd6", // priority / violet
  "#8a8f98", // frozen / grey
];

export function createLabel(name: string, colorIndex: number): Label {
  return { id: makeId(), name, color: LABEL_PALETTE[colorIndex % LABEL_PALETTE.length] };
}

/** Perceived brightness (0-255) via the standard luminance formula; used to pick readable text colour for a coloured chip. */
export function readableTextColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#241b3d" : "#ffffff";
}
