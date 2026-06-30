import { onStateChange } from "./state.js";

const CAMERA_STORAGE_KEY = "idle-farm-scene-camera-v1";
const PLAYFIELD_SIZE = 3840;
const SCENE_MARGIN = 720;
const BASE_SCENE_WIDTH = PLAYFIELD_SIZE + SCENE_MARGIN * 2;
const BASE_SCENE_HEIGHT = PLAYFIELD_SIZE + SCENE_MARGIN * 2;

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
      scale: 1,
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

function updateSceneSize() {
  sceneSize = {
    width: BASE_SCENE_WIDTH,
    height: BASE_SCENE_HEIGHT,
  };
}

function clampCameraToBounds() {
  const viewport = getViewportSize();
  const minX = viewport.width - sceneSize.width;
  const minY = viewport.height - sceneSize.height;

  camera.x = Math.min(0, Math.max(minX, camera.x));
  camera.y = Math.min(0, Math.max(minY, camera.y));
}

function applyCamera({ shouldSave = true } = {}) {
  if (!workspaceElement || !sceneElement) {
    return;
  }

  camera.x = Math.round(camera.x);
  camera.y = Math.round(camera.y);
  workspaceElement.style.setProperty("--scene-width", `${PLAYFIELD_SIZE}px`);
  workspaceElement.style.setProperty("--scene-height", `${PLAYFIELD_SIZE}px`);
  workspaceElement.style.setProperty("--scene-playfield-size", `${PLAYFIELD_SIZE}px`);
  workspaceElement.style.setProperty("--scene-margin", `${SCENE_MARGIN}px`);
  document.documentElement.style.setProperty("--scene-x", `${camera.x}px`);
  document.documentElement.style.setProperty("--scene-y", `${camera.y}px`);
  document.documentElement.style.setProperty("--scene-grid-size", "24px");
  document.documentElement.style.setProperty("--scene-grid-x", `${camera.x + SCENE_MARGIN}px`);
  document.documentElement.style.setProperty("--scene-grid-y", `${camera.y + SCENE_MARGIN}px`);

  if (shouldSave) {
    saveCamera();
  }
}

function refreshCameraBounds({ shouldCenter = false } = {}) {
  updateSceneSize();
  if (shouldCenter) {
    const viewport = getViewportSize();
    const centerX = SCENE_MARGIN + PLAYFIELD_SIZE / 2;
    const centerY = SCENE_MARGIN + PLAYFIELD_SIZE / 2;
    camera.x = viewport.width / 2 - centerX;
    camera.y = viewport.height / 2 - centerY;
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
  window.addEventListener("resize", () => refreshCameraBounds());
  onStateChange(queueBoundsRefresh);
}
