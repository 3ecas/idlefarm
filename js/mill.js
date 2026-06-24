import {
  getBarnItemQuantity,
  getCellDragBounds,
  isBuildingBuilt,
  millWheatToFlour,
  moveCell,
  onStateChange,
  state,
} from "./state.js";
import { getProduct } from "./catalog.js";
import { mountMovableCell } from "./drag.js";

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("mill");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

export function mountMill(container) {
  mountMovableCell(container, {
    key: "mill",
    selector: "[data-mill-cell]",
    dragHandle: ".mill-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("mill", finalPosition.left, finalPosition.top);
      return true;
    },
  });

  container.addEventListener("click", (event) => {
    const millButton = event.target.closest("[data-mill-wheat]");
    if (!millButton) {
      return;
    }

    event.preventDefault();
    millWheatToFlour();
  });

  function render() {
    if (!isBuildingBuilt("mill")) {
      container.innerHTML = "";
      return;
    }

    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.mill.left,
      state.cells.mill.top
    );
    const flour = getProduct("flour");
    const ingredients = flour?.millIngredients || {};
    const hasIngredients = Object.entries(ingredients).every(
      ([productId, quantity]) => getBarnItemQuantity(productId) >= quantity
    );
    const ingredientText = Object.entries(ingredients)
      .map(([productId, quantity]) => `${getProduct(productId)?.marketName || "Item"} x${quantity}`)
      .join(", ");

    container.innerHTML = `
      <section class="mill-cell" data-cell-key="mill" data-mill-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Mill">
        <div class="mill-header">
          <span class="mill-title">
            <span class="mill-title__icon" aria-hidden="true">🏭</span>
            <span class="mill-title__text">Mill</span>
          </span>
        </div>
        <div class="mill-body">
          <button type="button" class="mill-action ${hasIngredients ? "" : "is-disabled"}" data-mill-wheat aria-disabled="${hasIngredients ? "false" : "true"}">
            <span class="mill-action__name">${flour?.marketName || "Flour"}</span>
            <span class="mill-action__ingredients">${ingredientText}</span>
          </button>
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
