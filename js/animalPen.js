import { getProduct } from "./catalog.js";
import { getCellDragBounds, isBuildingBuilt, moveCell, onProgressChange, onStateChange, state } from "./state.js";
import { mountMovableCell } from "./drag.js";

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("animalPen");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

function getAnimalProductionProgress(animal) {
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

function getRequirementText(product) {
  const foodCost = product?.foodCost && typeof product.foodCost === "object" ? product.foodCost : {};
  return Object.entries(foodCost)
    .map(([productId, quantity]) => `${getProduct(productId)?.marketName || "Item"} x${quantity}`)
    .join(", ");
}

function renderAnimalCard(animal) {
  const product = getProduct(animal.productId);
  const outputProduct = product?.outputProductId ? getProduct(product.outputProductId) : null;
  const progress = getAnimalProductionProgress(animal);
  const label = product?.marketName || "Animal";
  const outputLabel = outputProduct?.marketName || "Product";
  const requirementText = getRequirementText(outputProduct);
  const status = animal.readyAt ? `${outputLabel} ${progress}%` : `Needs ${requirementText || "food"} 0%`;

  return `
    <div class="animal-item" data-animal-id="${animal.id}">
      <div class="animal-item__icon" aria-hidden="true">🐄</div>
      <div class="animal-item__name">${label}</div>
      <div class="animal-item__status">${status}</div>
      <span class="animal-item__progress" aria-hidden="true">
        <span class="animal-item__progress-fill" style="width:${progress}%"></span>
      </span>
    </div>
  `;
}

function renderFoodSlot() {
  const strawCount = state.animalPen.food.strawCrop || 0;
  return `
    <div class="animal-pen-food" data-animal-pen-food-drop>
      <div class="animal-pen-food__label">Food</div>
      <div class="animal-pen-food__value">Straw x${strawCount}</div>
    </div>
  `;
}

export function getAnimalPenDropTargetFromPoint(x, y) {
  if (!isBuildingBuilt("animalPen")) {
    return null;
  }

  const element = document.elementFromPoint(x, y);
  if (!element) {
    return null;
  }

  if (element.closest?.("[data-animal-pen-food-drop]")) {
    return "food";
  }

  if (element.closest?.("[data-animal-pen-cell]")) {
    return "animals";
  }

  return null;
}

export function mountAnimalPen(container) {
  mountMovableCell(container, {
    key: "animalPen",
    selector: "[data-animal-pen-cell]",
    dragHandle: ".animal-pen-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("animalPen", finalPosition.left, finalPosition.top);
      return true;
    },
  });

  function render() {
    if (!isBuildingBuilt("animalPen")) {
      container.innerHTML = "";
      return;
    }

    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.animalPen.left,
      state.cells.animalPen.top
    );

    const animals = state.animalPen.animals;

    container.innerHTML = `
      <section class="animal-pen-cell" data-cell-key="animalPen" data-animal-pen-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Cow pen">
        <div class="animal-pen-header">
          <span class="animal-pen-title">
            <span class="animal-pen-title__icon" aria-hidden="true">🐄</span>
            <span class="animal-pen-title__text">Cow Pen</span>
          </span>
        </div>
        <div class="animal-pen-body">
          ${renderFoodSlot()}
          <div class="animal-pen-list">
            ${
              animals.length > 0
                ? animals.map((animal) => renderAnimalCard(animal)).join("")
                : `<div class="animal-pen-empty">Drop a cow here</div>`
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
    if (!isBuildingBuilt("animalPen")) {
      return;
    }

    for (const animal of state.animalPen.animals) {
      const item = container.querySelector(`[data-animal-id="${animal.id}"]`);
      if (!item) {
        continue;
      }

      const progress = getAnimalProductionProgress(animal);
      const status = item.querySelector(".animal-item__status");
      const progressFill = item.querySelector(".animal-item__progress-fill");
      if (status) {
        status.textContent = animal.readyAt ? `Milk ${progress}%` : "Needs straw 0%";
      }
      if (progressFill) {
        progressFill.style.width = `${progress}%`;
      }
    }
  }
}
