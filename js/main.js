import { mountAnimalPen } from "./animalPen.js";
import { mountBarn } from "./barn.js";
import { mountBuild } from "./build.js";
import { mountBakery } from "./bakery.js";
import { mountMarket } from "./market.js";
import { mountMenu } from "./menu.js";
import { mountMill } from "./mill.js";
import { mountMoney } from "./money.js";
import { mountPlot } from "./plot.js";
import { mountSellMarket } from "./sellMarket.js";
import { mountShopping } from "./shopping.js";
import { mountToolCursor } from "./cursor.js";
import { bootstrapGamePersistence } from "./persistence.js";
import { mountTools } from "./tools.js";
import { getCellSize } from "./layout.js";
import { clearSelectedInventoryItem } from "./inventory.js";
import { clearActiveTool, getStarterLayoutPositions, isCellHidden, isToolActive, moveCell, onStateChange, restartFarm, setActiveTool, showCell, state } from "./state.js";

const statusRoot = document.getElementById("status");
const cellMount = document.getElementById("cell-mount");
const marketMount = document.getElementById("market-mount");
const sellMarketMount = document.getElementById("sell-market-mount");
const moneyMount = document.getElementById("money-mount");
const shoppingMount = document.getElementById("shopping-mount");
const barnMount = document.getElementById("barn-mount");
const buildMount = document.getElementById("build-mount");
const millMount = document.getElementById("mill-mount");
const bakeryMount = document.getElementById("bakery-mount");
const animalPenMount = document.getElementById("animal-pen-mount");
const menuMount = document.getElementById("menu-mount");
const toolsMount = document.getElementById("tools-mount");
const restartButton = document.querySelector("[data-restart-farm]");

function renderStatus() {
  statusRoot.textContent = state.message;
}

bootstrapGamePersistence();
mountPlot(cellMount);
mountMarket(marketMount);
mountSellMarket(sellMarketMount);
mountMoney(moneyMount);
mountShopping(shoppingMount);
mountBarn(barnMount);
mountBuild(buildMount);
mountMill(millMount);
mountBakery(bakeryMount);
mountAnimalPen(animalPenMount);
mountMenu(menuMount);
mountTools(toolsMount);
mountToolCursor();
onStateChange(renderStatus);
renderStatus();
ensureCorePanelsVisible();
refreshLayout();
window.requestAnimationFrame(() => {
  ensureCorePanelsVisible();
  refreshLayout();
});

function clearInteractionFromEmptySpace(event) {
  const interactiveElement = event.target.closest(
    "[data-cell-key], [data-delete-zone], [data-restart-farm], button, summary, input, textarea, select, a, label"
  );
  if (interactiveElement) {
    return false;
  }

  if (isToolActive("hand")) {
    event.preventDefault();
    event.stopPropagation();
    document.body.classList.remove("is-hand-tool-active", "is-dragging-cell");
    document.querySelectorAll(".is-dragging").forEach((element) => element.classList.remove("is-dragging"));
    window.getSelection()?.removeAllRanges();
  }

  clearActiveTool();
  clearSelectedInventoryItem();
  return true;
}

document.addEventListener("pointerdown", clearInteractionFromEmptySpace, { capture: true });
document.addEventListener("click", clearInteractionFromEmptySpace, { capture: true });

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  const interactiveElement = event.target.closest?.("input, textarea, select, [contenteditable='true']");
  if (interactiveElement) {
    return;
  }

  const shortcutTools = {
    h: "hand",
    w: "water",
    c: "harvest",
  };
  const toolId = shortcutTools[event.key.toLowerCase()];
  if (!toolId) {
    return;
  }

  event.preventDefault();
  setActiveTool(toolId);
});

if (restartButton) {
  restartButton.addEventListener("click", () => {
    restartFarm();
    ensureCorePanelsVisible();
    refreshLayout();
  });
}

function refreshLayout() {
  const workspace = document.getElementById("workspace");
  if (!workspace) {
    return;
  }

  if (workspace.clientWidth < 720) {
    const left = 16;
    const gap = 12;
    let top = 16;

    if (!isCellHidden("menu")) {
      moveCell("menu", left, top);
      top += getCellSize("menu").height + gap;
    }

    if (!isCellHidden("tools")) {
      moveCell("tools", left, top);
      top += getCellSize("tools").height + gap;
    }

    if (!isCellHidden("market")) {
      moveCell("market", left, top);
      top += getCellSize("market").height + gap;
    }

    if (!isCellHidden("sellMarket")) {
      moveCell("sellMarket", left, top);
      top += getCellSize("sellMarket").height + gap;
    }

    if (!isCellHidden("build")) {
      moveCell("build", left, top);
      top += getCellSize("build").height + gap;
    }

    if (state.buildings.animalPen) {
      moveCell("animalPen", left, top);
      top += getCellSize("animalPen").height + gap;
    }

    if (state.buildings.bakery) {
      moveCell("bakery", left, top);
      top += getCellSize("bakery").height + gap;
    }

    if (!isCellHidden("money")) {
      moveCell("money", left, top);
      top += getCellSize("money").height + gap;
    }

    if (!isCellHidden("barn")) {
      moveCell("barn", left, top);
      top += getCellSize("barn").height + gap;
    }

    if (state.buildings.mill) {
      moveCell("mill", left, top);
    }
    return;
  }

  for (const key of ["market", "sellMarket", "money", "barn", "build"]) {
    if (isCellHidden(key)) {
      continue;
    }

    const position = state.cells[key];
    moveCell(key, position.left, position.top);
  }

  for (const key of ["menu", "tools"]) {
    if (isCellHidden(key)) {
      continue;
    }
    const position = getStarterLayoutPositions()[key];
    moveCell(key, position.left, position.top);
  }

  if (state.buildings.mill) {
    const position = state.cells.mill;
    moveCell("mill", position.left, position.top);
  }

  if (state.buildings.bakery) {
    const position = state.cells.bakery;
    moveCell("bakery", position.left, position.top);
  }

  if (state.buildings.animalPen) {
    const position = state.cells.animalPen;
    moveCell("animalPen", position.left, position.top);
  }
}

function ensureCorePanelsVisible() {
  const starterLayout = getStarterLayoutPositions();

  if (isCellHidden("menu")) {
    showCell("menu");
  }
  if (isCellHidden("tools")) {
    showCell("tools");
  }

  moveCell("menu", starterLayout.menu.left, starterLayout.menu.top);
  moveCell("tools", starterLayout.tools.left, starterLayout.tools.top);
}

window.addEventListener("resize", refreshLayout);
