import {
  getAnimalFeederSlots,
  getCellDragBounds,
  isBuildingBuilt,
  moveCell,
  onStateChange,
  state,
  toggleAnimalFeederTarget,
} from "./state.js";
import { mountMovableCell } from "./drag.js";

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("animalFeeder");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

export function mountAnimalFeeder(container) {
  mountMovableCell(container, {
    key: "animalFeeder",
    selector: "[data-animal-feeder-cell]",
    dragHandle: ".animal-feeder-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("animalFeeder", finalPosition.left, finalPosition.top);
      return true;
    },
  });

  container.addEventListener("click", (event) => {
    const toggleButton = event.target.closest("[data-animal-feeder-target]");
    if (!toggleButton) {
      return;
    }

    event.preventDefault();
    toggleAnimalFeederTarget(toggleButton.dataset.animalFeederTarget);
  });

  function render() {
    if (!isBuildingBuilt("animalFeeder")) {
      container.innerHTML = "";
      return;
    }

    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.animalFeeder.left,
      state.cells.animalFeeder.top
    );
    const slots = getAnimalFeederSlots();

    container.innerHTML = `
      <section class="animal-feeder-cell" data-cell-key="animalFeeder" data-animal-feeder-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Animal feeder">
        <div class="animal-feeder-header">
          <span class="animal-feeder-title">
            <span class="animal-feeder-title__icon" aria-hidden="true">FD</span>
            <span class="animal-feeder-title__text">Animal Feeder</span>
          </span>
        </div>
        <div class="animal-feeder-body">
          ${slots
            .map(
              (slot) => `
                <button type="button" class="animal-feeder-slot ${slot.enabled ? "is-selected" : ""}" data-animal-feeder-target="${slot.id}" aria-pressed="${slot.enabled ? "true" : "false"}">
                  <span class="animal-feeder-slot__name">${slot.label}</span>
                  <span class="animal-feeder-slot__status">${slot.enabled ? slot.status : "Disabled"}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
