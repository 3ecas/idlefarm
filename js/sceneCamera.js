import { onStateChange } from "./state.js";

const CAMERA_STORAGE_KEY = "idle-farm-scene-camera-v1";
const BASE_SCENE_WIDTH = 2400;
const BASE_SCENE_HEIGHT = 1800;
const SCENE_MARGIN = 720;
const MIN_SCALE = 0.55;
const MAX_SCALE = 1.75;
const ZOOM_STEP = 1.16;

let camera = readCamera();
let sceneSize = { width: BASE_SCENE_WIDTH, height: BASE_SCENE_HEIGHT };
let workspaceElement = null;
let sceneElement = null;
let isPanning = false;
let panStart = null;
let boundsUpdateQueued = false;

function readCamera() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CAMERA_STORAGE_KEY) || "{}");
    return {
      x: Number.isFinite(parsed.x) ? parsed.x : 0,
      y: Number.isFinite(parsed.y) ? parsed.y : 0,
      scale: Number.isFinite(parsed.scale) ? parsed.scale : 1,
    };
  } catch {
    return { x: 0, y: 0, scale: 1 };
  }
}

function saveCamera() {
  try {
    localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(camera));
  } catch {
    // Best effort.
  }
}

export function getSceneScale() {
  return camera.scale;
}

export function screenDeltaToWorld(delta) {
  return delta / camera.scale;
}

function getViewportSize() {
  const rect = sceneElement?.getBoundingClientRect();
  return {
    width: rect?.width || window.innerWidth || 1024,
    height: rect?.height || window.innerHeight || 768,
  };
}

function getElementWorldRect(element) {
  return {
    left: element.offsetLeft,
    top: element.offsetTop,
    right: element.offsetLeft + element.offsetWidth,
    bottom: element.offsetTop + element.offsetHeight,
  };
}

function getContentBounds() {
  const elements = Array.from(workspaceElement?.querySelectorAll("[data-cell-key]") || []);
  if (elements.length === 0) {
    const viewport = getViewportSize();
    const centerX = sceneSize.width / 2;
    const centerY = sceneSize.height / 2;
    return {
      left: centerX - viewport.width / 2,
      top: centerY - viewport.height / 2,
      right: centerX + viewport.width / 2,
      bottom: centerY + viewport.height / 2,
    };
  }

  return elements.reduce((bounds, element) => {
    const rect = getElementWorldRect(element);
    return {
      left: Math.min(bounds.left, rect.left),
      top: Math.min(bounds.top, rect.top),
      right: Math.max(bounds.right, rect.right),
      bottom: Math.max(bounds.bottom, rect.bottom),
    };
  }, {
    left: Infinity,
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity,
  });
}

function updateSceneSize() {
  const viewport = getViewportSize();
  const bounds = getContentBounds();
  sceneSize = {
    width: Math.max(BASE_SCENE_WIDTH, viewport.width / camera.scale + SCENE_MARGIN * 2, bounds.right + SCENE_MARGIN),
    height: Math.max(BASE_SCENE_HEIGHT, viewport.height / camera.scale + SCENE_MARGIN * 2, bounds.bottom + SCENE_MARGIN),
  };
}

function clampCameraToBounds() {
  const viewport = getViewportSize();
  const bounds = getContentBounds();
  const minX = Math.max(0, bounds.left - SCENE_MARGIN);
  const minY = Math.max(0, bounds.top - SCENE_MARGIN);
  const maxX = Math.min(sceneSize.width, Math.max(minX + 1, bounds.right + SCENE_MARGIN));
  const maxY = Math.min(sceneSize.height, Math.max(minY + 1, bounds.bottom + SCENE_MARGIN));
  const viewWidth = viewport.width / camera.scale;
  const viewHeight = viewport.height / camera.scale;

  if (maxX - minX <= viewWidth) {
    camera.x = viewport.width / 2 - ((minX + maxX) / 2) * camera.scale;
  } else {
    camera.x = Math.min(-minX * camera.scale, Math.max(viewport.width - maxX * camera.scale, camera.x));
  }

  if (maxY - minY <= viewHeight) {
    camera.y = viewport.height / 2 - ((minY + maxY) / 2) * camera.scale;
  } else {
    camera.y = Math.min(-minY * camera.scale, Math.max(viewport.height - maxY * camera.scale, camera.y));
  }
}

function applyCamera({ shouldSave = true } = {}) {
  if (!workspaceElement || !sceneElement) {
    return;
  }

  workspaceElement.style.setProperty("--scene-width", `${sceneSize.width}px`);
  workspaceElement.style.setProperty("--scene-height", `${sceneSize.height}px`);
  document.documentElement.style.setProperty("--scene-x", `${camera.x}px`);
  document.documentElement.style.setProperty("--scene-y", `${camera.y}px`);
  document.documentElement.style.setProperty("--scene-scale", `${camera.scale}`);
  document.documentElement.style.setProperty("--scene-grid-size", `${24 * camera.scale}px`);
  document.documentElement.style.setProperty("--scene-grid-x", `${camera.x}px`);
  document.documentElement.style.setProperty("--scene-grid-y", `${camera.y}px`);

  if (shouldSave) {
    saveCamera();
  }
}

function refreshCameraBounds({ shouldCenter = false } = {}) {
  updateSceneSize();
  if (shouldCenter) {
    const viewport = getViewportSize();
    const bounds = getContentBounds();
    camera.x = viewport.width / 2 - ((bounds.left + bounds.right) / 2) * camera.scale;
    camera.y = viewport.height / 2 - ((bounds.top + bounds.bottom) / 2) * camera.scale;
  }
  clampCameraToBounds();
  applyCamera();
}

function queueBoundsRefresh() {
  if (boundsUpdateQueued) {
    return;
  }

  boundsUpdateQueued = true;
  window.requestAnimationFrame(() => {
    boundsUpdateQueued = false;
    refreshCameraBounds();
  });
}

function isScenePanTarget(event) {
  return !event.target.closest(
    "[data-cell-key], [data-delete-zone], [data-restart-farm], [data-side-panel], [data-side-tabs], [data-top-info-panel], .farm-controls, button, summary, input, textarea, select, a, label"
  );
}

function startPan(event) {
  if (event.button !== 0 || !isScenePanTarget(event)) {
    return;
  }

  isPanning = true;
  panStart = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    cameraX: camera.x,
    cameraY: camera.y,
  };
  document.body.classList.add("is-panning-scene");
  try {
    sceneElement.setPointerCapture(event.pointerId);
  } catch {
    // Best effort.
  }
}

function movePan(event) {
  if (!isPanning || !panStart || event.pointerId !== panStart.pointerId) {
    return;
  }

  camera.x = panStart.cameraX + event.clientX - panStart.x;
  camera.y = panStart.cameraY + event.clientY - panStart.y;
  clampCameraToBounds();
  applyCamera();
  event.preventDefault();
}

function endPan(event) {
  if (!isPanning || !panStart || event.pointerId !== panStart.pointerId) {
    return;
  }

  isPanning = false;
  panStart = null;
  document.body.classList.remove("is-panning-scene");
}

function zoomAt(clientX, clientY, nextScale) {
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
  const worldX = (clientX - camera.x) / camera.scale;
  const worldY = (clientY - camera.y) / camera.scale;
  camera.scale = scale;
  camera.x = clientX - worldX * camera.scale;
  camera.y = clientY - worldY * camera.scale;
  updateSceneSize();
  clampCameraToBounds();
  applyCamera();
}

function handleWheel(event) {
  if (!isScenePanTarget(event)) {
    return;
  }

  event.preventDefault();
  const direction = event.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
  zoomAt(event.clientX, event.clientY, camera.scale * direction);
}

function handleZoomButton(event) {
  const button = event.target.closest("[data-scene-zoom]");
  if (!button) {
    return;
  }

  const viewport = getViewportSize();
  const direction = button.dataset.sceneZoom === "in" ? ZOOM_STEP : 1 / ZOOM_STEP;
  zoomAt(viewport.width / 2, viewport.height / 2, camera.scale * direction);
}

export function mountSceneCamera() {
  workspaceElement = document.getElementById("workspace");
  sceneElement = document.querySelector(".scene");
  if (!workspaceElement || !sceneElement) {
    return;
  }

  refreshCameraBounds({ shouldCenter: true });
  sceneElement.addEventListener("pointerdown", startPan);
  sceneElement.addEventListener("pointermove", movePan, { passive: false });
  sceneElement.addEventListener("pointerup", endPan);
  sceneElement.addEventListener("pointercancel", endPan);
  sceneElement.addEventListener("wheel", handleWheel, { passive: false });
  document.addEventListener("click", handleZoomButton);
  window.addEventListener("resize", () => refreshCameraBounds());
  onStateChange(queueBoundsRefresh);
}
