import { mountPlot } from "./plot.js";
import { mountSellMarket } from "./sellMarket.js";
import { mountFarmCursors } from "./cursor.js";
import { bootstrapGamePersistence } from "./persistence.js";
import { clearSelectedInventoryItem } from "./inventory.js";
import { mountInfoPanel } from "./infoPanel.js";
import { mountSidePanels } from "./sidePanels.js";
import { moveCell, onStateChange, restartFarm, showCell, state } from "./state.js";

const statusRoot = document.getElementById("status");
const cellMount = document.getElementById("cell-mount");
const sellMarketMount = document.getElementById("sell-market-mount");
const restartButton = document.querySelector("[data-restart-farm]");

function renderStatus() {
  statusRoot.textContent = state.message;
}

bootstrapGamePersistence();
showCell("sellMarket");
moveCell("sellMarket", 480, 48);
mountPlot(cellMount);
mountSellMarket(sellMarketMount);
mountInfoPanel();
mountSidePanels();
mountFarmCursors();
onStateChange(renderStatus);
renderStatus();

document.addEventListener("pointerdown", (event) => {
  const interactiveElement = event.target.closest(
    "[data-cell-key], [data-delete-zone], [data-restart-farm], [data-side-panel], [data-side-tabs], button, summary, input, textarea, select, a, label"
  );
  if (!interactiveElement) {
    clearSelectedInventoryItem();
  }
}, { capture: true });

if (restartButton) {
  restartButton.addEventListener("click", () => {
    restartFarm();
    showCell("sellMarket");
    moveCell("sellMarket", 480, 48);
  });
}
