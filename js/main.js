import { mountBarn } from "./barn.js";
import { mountBuild } from "./build.js";
import { mountMarket } from "./market.js";
import { mountMenu } from "./menu.js";
import { mountMill } from "./mill.js";
import { mountMoney } from "./money.js";
import { mountPlot } from "./plot.js";
import { mountSellMarket } from "./sellMarket.js";
import { mountShopping } from "./shopping.js";
import { mountTools } from "./tools.js";
import { getCellSize } from "./layout.js";
import { clearSelectedInventoryItem } from "./inventory.js";
import { applyStarterLayout, clearActiveTool, isCellHidden, isToolActive, moveCell, onStateChange, restartFarm, setActiveTool, state } from "./state.js";

const statusRoot = document.getElementById("status");
const cellMount = document.getElementById("cell-mount");
const marketMount = document.getElementById("market-mount");
const sellMarketMount = document.getElementById("sell-market-mount");
const moneyMount = document.getElementById("money-mount");
const shoppingMount = document.getElementById("shopping-mount");
const barnMount = document.getElementById("barn-mount");
const buildMount = document.getElementById("build-mount");
const millMount = document.getElementById("mill-mount");
const menuMount = document.getElementById("menu-mount");
const toolsMount = document.getElementById("tools-mount");
const restartButton = document.querySelector("[data-restart-farm]");

function renderStatus() {
  statusRoot.textContent = state.message;
}

mountPlot(cellMount);
mountMarket(marketMount);
mountSellMarket(sellMarketMount);
mountMoney(moneyMount);
mountShopping(shoppingMount);
mountBarn(barnMount);
mountBuild(buildMount);
mountMill(millMount);
mountMenu(menuMount);
mountTools(toolsMount);
onStateChange(renderStatus);
renderStatus();
applyStarterLayout();

document.addEventListener("pointerdown", (event) => {
  const interactiveElement = event.target.closest(
    "[data-cell-key], [data-delete-zone], [data-restart-farm], button, summary, input, textarea, select, a, label"
  );
  if (interactiveElement) {
    return;
  }

  if (isToolActive("hand")) {
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    return;
  }

  clearActiveTool();
  clearSelectedInventoryItem();
});

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

  for (const key of ["market", "sellMarket", "money", "barn", "build", "menu", "tools"]) {
    if (isCellHidden(key)) {
      continue;
    }

    const position = state.cells[key];
    moveCell(key, position.left, position.top);
  }

  if (state.buildings.mill) {
    const position = state.cells.mill;
    moveCell("mill", position.left, position.top);
  }
}

window.addEventListener("resize", refreshLayout);
refreshLayout();
