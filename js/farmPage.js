import { mountPlot } from "./plot.js";
import { mountAnimalFeeder } from "./animalFeeder.js";
import { mountAnimalPen } from "./animalPen.js";
import { mountBakery } from "./bakery.js";
import { mountChickenCoop } from "./chickenCoop.js";
import { mountMill } from "./mill.js";
import { mountFarmCursors } from "./cursor.js";
import { bootstrapGamePersistence } from "./persistence.js";
import { clearSelectedInventoryItem } from "./inventory.js";
import { mountInfoPanel } from "./infoPanel.js";
import { mountSidePanels } from "./sidePanels.js";
import { mountSceneCamera } from "./sceneCamera.js";
import { onStateChange, restartFarm, showCell, stabilizeLayoutPositions, state } from "./state.js";

const statusRoot = document.getElementById("status");
const cellMount = document.getElementById("cell-mount");
const millMount = document.getElementById("mill-mount");
const bakeryMount = document.getElementById("bakery-mount");
const animalFeederMount = document.getElementById("animal-feeder-mount");
const animalPenMount = document.getElementById("animal-pen-mount");
const chickenCoopMount = document.getElementById("chicken-coop-mount");
const restartButton = document.querySelector("[data-restart-farm]");

function renderStatus() {
  statusRoot.textContent = state.message;
}

bootstrapGamePersistence();
mountPlot(cellMount);
mountMill(millMount);
mountBakery(bakeryMount);
mountAnimalFeeder(animalFeederMount);
mountAnimalPen(animalPenMount);
mountChickenCoop(chickenCoopMount);
mountInfoPanel();
mountSidePanels();
mountFarmCursors();
mountSceneCamera();
onStateChange(renderStatus);
renderStatus();
window.addEventListener("resize", () => {
  stabilizeLayoutPositions();
});

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
  });
}
