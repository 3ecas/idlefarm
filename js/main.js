import { mountAnimalPen } from "./animalPen.js";
import { mountAnimalFeeder } from "./animalFeeder.js";
import { mountBarn } from "./barn.js";
import { mountBuild } from "./build.js";
import { mountBakery } from "./bakery.js";
import { mountFastItems } from "./fastItems.js";
import { mountMarket } from "./market.js";
import { mountMenu } from "./menu.js";
import { mountMill } from "./mill.js";
import { mountMoney } from "./money.js";
import { mountPlot } from "./plot.js";
import { mountSellMarket } from "./sellMarket.js";
import { mountShopping } from "./shopping.js";
import { mountFarmCursors } from "./cursor.js";
import { bootstrapGamePersistence } from "./persistence.js";
import { getCellSize } from "./layout.js";
import { clearSelectedInventoryItem } from "./inventory.js";
import { getStarterLayoutPositions, isCellHidden, moveCell, onStateChange, restartFarm, showCell, state } from "./state.js";

const statusRoot = document.getElementById("status");
const cellMount = document.getElementById("cell-mount");
const marketMount = document.getElementById("market-mount");
const sellMarketMount = document.getElementById("sell-market-mount");
const moneyMount = document.getElementById("money-mount");
const shoppingMount = document.getElementById("shopping-mount");
const barnMount = document.getElementById("barn-mount");
const fastItemsMount = document.getElementById("fast-items-mount");
const buildMount = document.getElementById("build-mount");
const millMount = document.getElementById("mill-mount");
const bakeryMount = document.getElementById("bakery-mount");
const animalFeederMount = document.getElementById("animal-feeder-mount");
const animalPenMount = document.getElementById("animal-pen-mount");
const menuMount = document.getElementById("menu-mount");
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
mountFastItems(fastItemsMount);
mountBuild(buildMount);
mountMill(millMount);
mountBakery(bakeryMount);
mountAnimalFeeder(animalFeederMount);
mountAnimalPen(animalPenMount);
mountMenu(menuMount);
mountFarmCursors();
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

  clearSelectedInventoryItem();
  return true;
}

document.addEventListener("pointerdown", clearInteractionFromEmptySpace, { capture: true });
document.addEventListener("click", clearInteractionFromEmptySpace, { capture: true });

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

    if (!isCellHidden("market")) {
      moveCell("market", left, top);
      top += getCellSize("market").height + gap;
    }

    if (!isCellHidden("sellMarket")) {
      moveCell("sellMarket", left, top);
      top += getCellSize("sellMarket").height + gap;
    }

    if (!isCellHidden("fastItems")) {
      moveCell("fastItems", left, top);
      top += getCellSize("fastItems").height + gap;
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

    if (state.buildings.animalFeeder) {
      moveCell("animalFeeder", left, top);
      top += getCellSize("animalFeeder").height + gap;
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

  for (const key of ["market", "sellMarket", "money", "barn", "fastItems", "build"]) {
    if (isCellHidden(key)) {
      continue;
    }

    const position = state.cells[key];
    moveCell(key, position.left, position.top);
  }

  for (const key of ["menu"]) {
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

  if (state.buildings.animalFeeder) {
    const position = state.cells.animalFeeder;
    moveCell("animalFeeder", position.left, position.top);
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

  moveCell("menu", starterLayout.menu.left, starterLayout.menu.top);
}

window.addEventListener("resize", refreshLayout);
