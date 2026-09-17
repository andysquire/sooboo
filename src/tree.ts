import type { Position } from "./types";

let idCounter = 0;
export function makeId(): string {
  idCounter += 1;
  return `pos-${Date.now().toString(36)}-${idCounter}`;
}

export function createPosition(title: string, cost = 0): Position {
  return { id: makeId(), title, cost, children: [] };
}

export function createDefaultChart(): Position {
  const ceo = createPosition("Chief Executive", 75000);
  const director = createPosition("Director of Student Voice", 52000);
  const marketing = createPosition("Marketing Manager", 42000);
  const commercial = createPosition("Commercial Operations Manager", 45000);
  ceo.children = [director, marketing, commercial];
  director.children = [createPosition("Advice Coordinator", 34000), createPosition("Activities Coordinator", 32000)];
  commercial.children = [createPosition("Venue Duty Manager", 30000), createPosition("Bar Supervisor", 26000)];
  return ceo;
}

export function totalCost(node: Position): number {
  return node.cost + node.children.reduce((sum, child) => sum + totalCost(child), 0);
}

export function countPositions(node: Position): number {
  return 1 + node.children.reduce((sum, child) => sum + countPositions(child), 0);
}

export function findNode(node: Position, id: string): Position | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

export function isDescendant(node: Position, ancestorId: string): boolean {
  // Is `node` the same as, or a descendant of, the position with id ancestorId?
  if (node.id === ancestorId) return true;
  return node.children.some((child) => isDescendant(child, ancestorId));
}

export function updatePosition(
  node: Position,
  id: string,
  patch: Partial<Pick<Position, "title" | "cost" | "labelId">>
): Position {
  if (node.id === id) return { ...node, ...patch };
  return { ...node, children: node.children.map((child) => updatePosition(child, id, patch)) };
}

/** Clears labelId wherever it references `labelId`, e.g. after that label is deleted. */
export function unsetLabelEverywhere(node: Position, labelId: string): Position {
  const cleared = node.labelId === labelId ? { ...node, labelId: null } : node;
  return { ...cleared, children: node.children.map((child) => unsetLabelEverywhere(child, labelId)) };
}

export function addChild(node: Position, parentId: string, child: Position): Position {
  if (node.id === parentId) return { ...node, children: [...node.children, child] };
  return { ...node, children: node.children.map((c) => addChild(c, parentId, child)) };
}

/** Removes the node with `id` from the tree, returning the new tree and the removed subtree (or null if not found / is root). */
export function removeNode(node: Position, id: string): { tree: Position; removed: Position | null } {
  let removed: Position | null = null;
  const strip = (n: Position): Position => {
    const filteredChildren: Position[] = [];
    for (const child of n.children) {
      if (child.id === id) {
        removed = child;
      } else {
        filteredChildren.push(strip(child));
      }
    }
    return { ...n, children: filteredChildren };
  };
  const tree = strip(node);
  return { tree, removed };
}

/** Deletes a position. If it has children, they are promoted to become children of its parent. */
export function deletePosition(root: Position, id: string): Position {
  const { tree, removed } = removeNode(root, id);
  if (!removed) return root;
  if (removed.children.length === 0) return tree;
  const parentId = findParentId(root, id);
  if (!parentId) return tree; // deleted node was the root's direct removal target with no parent (shouldn't happen)
  const attachChildren = (n: Position): Position => {
    if (n.id === parentId) return { ...n, children: [...n.children, ...removed!.children] };
    return { ...n, children: n.children.map(attachChildren) };
  };
  return attachChildren(tree);
}

export function findParentId(node: Position, childId: string): string | null {
  for (const child of node.children) {
    if (child.id === childId) return node.id;
    const found = findParentId(child, childId);
    if (found) return found;
  }
  return null;
}

/** Deletes a position along with its entire subtree. */
export function deletePositionWithChildren(root: Position, id: string): Position {
  return removeNode(root, id).tree;
}

/** Moves the subtree rooted at `dragId` to become a child of `dropId`. No-ops on invalid moves (self, ancestor, root, already-parent). */
export function moveNode(root: Position, dragId: string, dropId: string): Position {
  if (dragId === dropId) return root;
  if (dragId === root.id) return root; // can't move the root
  const dragged = findNode(root, dragId);
  if (!dragged) return root;
  if (isDescendant(dragged, dropId)) return root; // can't drop onto own descendant (or itself)
  const currentParentId = findParentId(root, dragId);
  if (currentParentId === dropId) return root; // already there

  const { tree, removed } = removeNode(root, dragId);
  if (!removed) return root;
  return addChild(tree, dropId, removed);
}

export function toCsvRows(
  node: Position,
  labelNamesById: Map<string, string>,
  depth = 0,
  parentTitle = ""
): string[][] {
  const labelName = node.labelId ? (labelNamesById.get(node.labelId) ?? "") : "";
  const rows: string[][] = [[String(depth), node.title, parentTitle, node.cost.toFixed(2), labelName]];
  for (const child of node.children) {
    rows.push(...toCsvRows(child, labelNamesById, depth + 1, node.title));
  }
  return rows;
}
