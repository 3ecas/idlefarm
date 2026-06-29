import { deleteCellByKey, moveCell, moveFarmPlot, state } from "./state.js";
import { getSceneScale, screenDeltaToWorld } from "./sceneCamera.js";

const GRID_SIZE = 24;
const DRAG_THRESHOLD = 4;
const EDGE_SNAP_DISTANCE = 14;
const STARTING_FRONT_LAYER = 40;

let dragState = null;
let topLayer = STARTING_FRONT_LAYER;
let layerSyncQueued = false;
const recentDraggedKeys = new Map();
const cellLayers = new Map();

function markRecentlyDragged(key) {
  recentDraggedKeys.set(key, Date.now());
  window.setTimeout(() => {
    const recorded = recentDraggedKeys.get(key);
    if (recorded && Date.now() - recorded >= 300) {
      recentDraggedKeys.delete(key);
    }
  }, 300);
}

export function wasRecentlyDragged(key) {
  const timestamp = recentDraggedKeys.get(key);
  if (!timestamp) {
    return false;
  }

  if (Date.now() - timestamp > 300) {
    recentDraggedKeys.delete(key);
    return false;
  }

  return true;
}

function clampToWorkspace(workspace, left, top, width, height) {
  const maxLeft = Math.max(0, workspace.clientWidth - width);
  const maxTop = Math.max(0, workspace.clientHeight - height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function getElementOffset(element, axis) {
  const offsetKey = axis === "left" ? "offsetLeft" : "offsetTop";
  const styleValue = Number.parseFloat(element.style[axis]);
  if (Number.isFinite(styleValue)) {
    return styleValue;
  }

  const offsetValue = element[offsetKey];
  return Number.isFinite(offsetValue) ? offsetValue : 0;
}

function getWorkspaceRect(workspace, element) {
  const workspaceRect = workspace.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const scale = getSceneScale();
  return {
    left: (rect.left - workspaceRect.left) / scale,
    top: (rect.top - workspaceRect.top) / scale,
    right: (rect.right - workspaceRect.left) / scale,
    bottom: (rect.bottom - workspaceRect.top) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
}

function isFarmPlotKey(key) {
  return typeof key === "string" && key.startsWith("farm-plot-");
}

function applyStoredLayers() {
  layerSyncQueued = false;
  for (const cell of document.querySelectorAll("[data-cell-key]")) {
    const layer = cellLayers.get(cell.dataset.cellKey);
    if (Number.isFinite(layer)) {
      cell.style.zIndex = String(layer);
    }
  }
}

function queueLayerSync() {
  if (layerSyncQueued) {
    return;
  }

  layerSyncQueued = true;
  window.requestAnimationFrame(applyStoredLayers);
}

function bringCellToFront(cell) {
  const key = cell.dataset.cellKey;
  if (!key) {
    return;
  }

  topLayer += 1;
  cellLayers.set(key, topLayer);
  cell.style.zIndex = String(topLayer);
  queueLayerSync();
}

function getDeleteZoneRect() {
  const zone = document.querySelector("[data-delete-zone]");
  return zone ? zone.getBoundingClientRect() : null;
}

function setDeleteZoneActive(isActive) {
  const zone = document.querySelector("[data-delete-zone]");
  if (zone) {
    zone.classList.toggle("is-active", Boolean(isActive));
  }
}

function overlaps(left, top, width, height, rect, padding = 0) {
  return (
    left < rect.right + padding &&
    left + width + padding > rect.left &&
    top < rect.bottom + padding &&
    top + height + padding > rect.top
  );
}

function getViewportRect(workspace, left, top, width, height) {
  const workspaceRect = workspace.getBoundingClientRect();
  const scale = getSceneScale();
  return {
    left: workspaceRect.left + left * scale,
    top: workspaceRect.top + top * scale,
    right: workspaceRect.left + (left + width) * scale,
    bottom: workspaceRect.top + (top + height) * scale,
    width: width * scale,
    height: height * scale,
  };
}

function isInsideDeleteZone(workspace, left, top, width, height) {
  const rect = getDeleteZoneRect();
  if (!rect) {
    return false;
  }

  const cellRect = getViewportRect(workspace, left, top, width, height);
  return overlaps(cellRect.left, cellRect.top, cellRect.width, cellRect.height, rect, 0);
}

function findNearestSnap(rawValue, candidates) {
  let nearest = null;

  for (const candidate of candidates) {
    const distance = Math.abs(rawValue - candidate);
    if (distance > EDGE_SNAP_DISTANCE) {
      continue;
    }

    if (!nearest || distance < nearest.distance) {
      nearest = { value: candidate, distance };
    }
  }

  return nearest ? nearest.value : null;
}

function getSettledPosition(key, workspace, rawLeft, rawTop, width, height) {
  const rawPosition = clampToWorkspace(workspace, rawLeft, rawTop, width, height);
  const gridPosition = clampToWorkspace(
    workspace,
    snapToGrid(rawPosition.left),
    snapToGrid(rawPosition.top),
    width,
    height
  );
  const otherRects = Array.from(document.querySelectorAll("[data-cell-key]"))
    .filter((element) => element.dataset.cellKey !== key)
    .map((element) => getWorkspaceRect(workspace, element));

  const xCandidates = [];
  const yCandidates = [];
  for (const rect of otherRects) {
    xCandidates.push(rect.left, rect.right, rect.left - width, rect.right - width);
    yCandidates.push(rect.top, rect.bottom, rect.top - height, rect.bottom - height);
  }

  const snappedLeft = findNearestSnap(rawPosition.left, xCandidates);
  const snappedTop = findNearestSnap(rawPosition.top, yCandidates);

  return clampToWorkspace(
    workspace,
    snappedLeft ?? gridPosition.left,
    snappedTop ?? gridPosition.top,
    width,
    height
  );
}

function endDrag() {
  if (!dragState) {
    return null;
  }

  const snapshot = dragState;
  snapshot.cell.classList.remove("is-dragging");
  document.body.classList.remove("is-dragging-cell");

  try {
    snapshot.cell.releasePointerCapture(snapshot.pointerId);
  } catch {
    // Best effort.
  }

  dragState = null;
  return snapshot;
}

export function mountMovableCell(container, { key, selector, dragHandle = null, onDrop }) {
  container.addEventListener("pointerdown", (event) => {
    const cell = event.target.closest(selector);
    if (!cell || event.button !== 0) {
      return;
    }

    const interactiveAncestor = event.target.closest("button, summary, input, textarea, select, a, label");
    const isFarmPlotTile = Boolean(event.target.closest("[data-plot-tile-id]"));
    if (interactiveAncestor && interactiveAncestor !== cell && !isFarmPlotTile) {
      return;
    }

    if (dragHandle) {
      const handle = event.target.closest(dragHandle);
      if (!handle || !cell.contains(handle)) {
        return;
      }
    }

    const workspace = container.closest(".workspace");
    if (!workspace) {
      return;
    }

    bringCellToFront(cell);

    const startLeft = getElementOffset(cell, "left");
    const startTop = getElementOffset(cell, "top");

    event.preventDefault();

    dragState = {
      key: cell.dataset.cellKey || key,
      cell,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft,
      startTop,
      currentLeft: startLeft,
      currentTop: startTop,
      width: cell.offsetWidth,
      height: cell.offsetHeight,
      moved: false,
      workspace,
    };

    try {
      cell.setPointerCapture(event.pointerId);
    } catch {
      // Best effort.
    }
  });

  container.addEventListener("pointermove", (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const screenDeltaX = event.clientX - dragState.startX;
    const screenDeltaY = event.clientY - dragState.startY;

    if (!dragState.moved && Math.hypot(screenDeltaX, screenDeltaY) < DRAG_THRESHOLD) {
      return;
    }

    dragState.moved = true;
    dragState.cell.classList.add("is-dragging");
    document.body.classList.add("is-dragging-cell");
    const deltaX = screenDeltaToWorld(screenDeltaX);
    const deltaY = screenDeltaToWorld(screenDeltaY);
    const position = clampToWorkspace(
      dragState.workspace,
      dragState.startLeft + deltaX,
      dragState.startTop + deltaY,
      dragState.width,
      dragState.height
    );
    dragState.currentLeft = position.left;
    dragState.currentTop = position.top;
    dragState.cell.style.left = `${position.left}px`;
    dragState.cell.style.top = `${position.top}px`;
    setDeleteZoneActive(isInsideDeleteZone(dragState.workspace, position.left, position.top, dragState.width, dragState.height));
    if (dragState.key === "market") {
      window.dispatchEvent(new Event("idle-farm-market-moved"));
    }
    event.preventDefault();
  });

  container.addEventListener("pointerup", (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const snapshot = endDrag();
    if (!snapshot) {
      return;
    }

    if (!snapshot.moved) {
      return;
    }

    const finalPosition = getSettledPosition(
      snapshot.key,
      snapshot.workspace,
      snapshot.currentLeft,
      snapshot.currentTop,
      snapshot.width,
      snapshot.height
    );
    const isDeleted =
      snapshot.moved &&
      isInsideDeleteZone(snapshot.workspace, finalPosition.left, finalPosition.top, snapshot.width, snapshot.height);
    setDeleteZoneActive(false);

    if (isDeleted) {
      deleteCellByKey(snapshot.key);
      if (snapshot.key === "market") {
        window.dispatchEvent(new Event("idle-farm-market-moved"));
      }
      event.preventDefault();
      return;
    }

    const settledPosition = snapshot.moved
      ? finalPosition
      : { left: snapshot.startLeft, top: snapshot.startTop };

    if (snapshot.moved) {
      markRecentlyDragged(snapshot.key);
    }

    if (typeof onDrop === "function" && onDrop(snapshot, settledPosition) === true) {
      queueLayerSync();
      if (snapshot.key === "market") {
        window.dispatchEvent(new Event("idle-farm-market-moved"));
      }
      event.preventDefault();
      return;
    }

    if (snapshot.key in state.cells) {
      moveCell(snapshot.key, settledPosition.left, settledPosition.top);
    }
    queueLayerSync();
    if (snapshot.key === "market") {
      window.dispatchEvent(new Event("idle-farm-market-moved"));
    }

    event.preventDefault();
  });

  container.addEventListener("pointercancel", () => {
    if (!dragState) {
      return;
    }

    setDeleteZoneActive(false);
    const snapshot = endDrag();
    if (!snapshot) {
      return;
    }

    snapshot.cell.style.left = `${snapshot.startLeft}px`;
    snapshot.cell.style.top = `${snapshot.startTop}px`;
    if (snapshot.key in state.cells) {
      moveCell(snapshot.key, snapshot.startLeft, snapshot.startTop);
    } else if (isFarmPlotKey(snapshot.key)) {
      moveFarmPlot(snapshot.key, snapshot.startLeft, snapshot.startTop);
    }
    queueLayerSync();
    if (snapshot.key === "market") {
      window.dispatchEvent(new Event("idle-farm-market-moved"));
    }
  });
}
