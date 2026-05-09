/**
 * Helpers para ordem das colunas do Kanban (`lane0` + ids de tags).
 * Mantém mesma convenção que `Kanban/index.js` (organizeLanes).
 */

/** Junta ordem salva pelo backend com as lanes válidas atualmente (nova tag no fim da ordem faltante). */
export function mergeKanbanLaneIds(savedOrder, orderedKanbanTags) {
  const defaultLanes = ["lane0", ...orderedKanbanTags.map((t) => String(t.id))];

  if (!savedOrder || savedOrder.length === 0) {
    return [...defaultLanes];
  }

  const validIds = new Set(defaultLanes);
  const merged = [];

  savedOrder.forEach((id) => {
    if (validIds.has(id)) merged.push(id);
  });

  defaultLanes.forEach((id) => {
    if (!merged.includes(id)) merged.push(id);
  });

  return merged;
}

/** Reinsere uma lane (`movingLaneId`) na posição desejada em relação a `anchorLaneId`. */
export function insertLaneRelativeToAnchor(
  mergedOrder,
  movingLaneId,
  anchorLaneId,
  placement
) {
  const moving = String(movingLaneId);
  const anchor =
    anchorLaneId === null || anchorLaneId === undefined || anchorLaneId === ""
      ? "lane0"
      : String(anchorLaneId);

  const list = mergedOrder.filter((id) => id !== moving);
  let anchorIndex = list.indexOf(anchor);
  if (anchorIndex === -1) {
    anchorIndex = list.indexOf("lane0");
    if (anchorIndex === -1) anchorIndex = 0;
  }

  let insertAt = placement === "before" ? anchorIndex : anchorIndex + 1;
  if (moving !== "lane0") {
    insertAt = Math.max(1, insertAt);
  }

  const next = [...list];
  next.splice(insertAt, 0, moving);
  return next;
}
