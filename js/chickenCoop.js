import { getProduct } from "./catalog.js";
import {
  addChickenFoodToCoop,
  getBarnItemQuantity,
  getCellDragBounds,
  isBuildingBuilt,
  moveCell,
  onProgressChange,
  onStateChange,
  removeChickenFoodFromCoop,
  state,
} from "./state.js";
import { mountMovableCell } from "./drag.js";

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("chickenCoop");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

function getProductionProgress(animal) {
  if (!animal || !Number.isFinite(animal.readyAt)) {
    return 0;
  }

  const animalProduct = getProduct(animal.productId);
  const product = animalProduct?.outputProductId ? getProduct(animalProduct.outputProductId) : null;
  const duration = Number.isFinite(product?.productionDurationMs) ? product.productionDurationMs : 0;
  if (duration <= 0) {
    return 0;
  }

  const remaining = Math.max(0, animal.readyAt - Date.now());
  return Math.max(0, Math.min(100, Math.round((1 - remaining / duration) * 100)));
}

function renderAnimalCard(animal) {
  const product = getProduct(animal.productId);
  const outputProduct = product?.outputProductId ? getProduct(product.outputProductId) : null;
  const progress = getProductionProgress(animal);
  const label = product?.marketName || "Animal";
  const outputLabel = outputProduct?.marketName || "Product";
  const status = animal.readyAt ? `${outputLabel} ${progress}%` : `${outputLabel} soon`;

  return `
    <div class="animal-item" data-chicken-id="${animal.id}">
      <div class="animal-item__icon" aria-hidden="true">${product?.icon || "🐔"}</div>
      <div class="animal-item__name">${label}</div>
      <div class="animal-item__status">${status}</div>
      <span class="animal-item__progress" aria-hidden="true">
        <span class="animal-item__progress-fill" style="width:${progress}%"></span>
      </span>
    </div>
  `;
}

function formatFoodQuantity(quantity) {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1);
}

function renderFoodSlot() {
  const cornCount = state.chickenCoop.food.cornCrop || 0;
  const canAddFood = getBarnItemQuantity("cornCrop") > 0;
  const canRemoveFood = cornCount > 0;
  return `
    <div class="animal-pen-food chicken-coop-food" data-chicken-coop-food-drop>
      <div class="animal-pen-food__label">Food</div>
      <div class="chicken-coop-food__controls">
        <button
          type="button"
          class="chicken-coop-food__control"
          data-chicken-coop-food-action="remove"
          aria-label="Remove corn from chicken coop"
          ${canRemoveFood ? "" : "disabled"}
        >
          -
        </button>
        <div class="animal-pen-food__value">Corn x${formatFoodQuantity(cornCount)}</div>
        <button
          type="button"
          class="chicken-coop-food__control"
          data-chicken-coop-food-action="add"
          aria-label="Add corn to chicken coop"
          ${canAddFood ? "" : "disabled"}
        >
          +
        </button>
      </div>
    </div>
  `;
}

export function getChickenCoopDropTargetFromPoint(x, y) {
  if (!isBuildingBuilt("chickenCoop")) {
    return null;
  }

  const element = document.elementFromPoint(x, y);
  if (!element) {
    return null;
  }

  if (element.closest?.("[data-chicken-coop-food-drop]")) {
    return "food";
  }

  return element.closest?.("[data-chicken-coop-cell]") ? "animals" : null;
}

export function mountChickenCoop(container) {
  function handleFoodControlClick(event) {
    const button = event.target.closest?.("[data-chicken-coop-food-action]");
    if (!button || !container.contains(button)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const action = button.dataset.chickenCoopFoodAction;
    if (action === "add") {
      addChickenFoodToCoop("cornCrop", 1);
    } else if (action === "remove") {
      removeChickenFoodFromCoop("cornCrop", 1);
    }
  }

  mountMovableCell(container, {
    key: "chickenCoop",
    selector: "[data-chicken-coop-cell]",
    dragHandle: ".chicken-coop-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("chickenCoop", finalPosition.left, finalPosition.top);
      return true;
    },
  });
  container.addEventListener("click", handleFoodControlClick);

  function render() {
    if (!isBuildingBuilt("chickenCoop")) {
      container.innerHTML = "";
      return;
    }

    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.chickenCoop.left,
      state.cells.chickenCoop.top
    );

    const animals = state.chickenCoop.animals;

    container.innerHTML = `
      <section class="animal-pen-cell chicken-coop-cell" data-cell-key="chickenCoop" data-chicken-coop-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Chicken coop">
        <div class="animal-pen-header chicken-coop-header">
          <span class="animal-pen-title chicken-coop-title">
            <span class="animal-pen-title__icon chicken-coop-title__icon" aria-hidden="true">CH</span>
            <span class="animal-pen-title__text">Chicken Coop</span>
          </span>
        </div>
        <div class="animal-pen-body">
          ${renderFoodSlot()}
          <div class="animal-pen-list">
            ${
              animals.length > 0
                ? animals.map((animal) => renderAnimalCard(animal)).join("")
                : `<div class="animal-pen-empty">Drop a chicken here</div>`
            }
          </div>
        </div>
      </section>
    `;
  }

  onStateChange(render);
  onProgressChange(updateProgress);
  render();
  window.addEventListener("resize", render);

  function updateProgress() {
    if (!isBuildingBuilt("chickenCoop")) {
      return;
    }

    for (const animal of state.chickenCoop.animals) {
      const item = container.querySelector(`[data-chicken-id="${animal.id}"]`);
      if (!item) {
        continue;
      }

      const product = getProduct(animal.productId);
      const outputProduct = product?.outputProductId ? getProduct(product.outputProductId) : null;
      const outputLabel = outputProduct?.marketName || "Product";
      const progress = getProductionProgress(animal);
      const status = item.querySelector(".animal-item__status");
      const progressFill = item.querySelector(".animal-item__progress-fill");
      if (status) {
        status.textContent = animal.readyAt ? `${outputLabel} ${progress}%` : `${outputLabel} soon`;
      }
      if (progressFill) {
        progressFill.style.width = `${progress}%`;
      }
    }
  }
}
