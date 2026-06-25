import { getProduct } from "./catalog.js";
import { bakeBread, canBakeBread, getCellDragBounds, hideCell, isBuildingBuilt, moveCell, onProgressChange, onStateChange, setMessage, state } from "./state.js";
import { mountMovableCell } from "./drag.js";

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("bakery");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

function getBakeryOrderProgress(order) {
  if (!order || !Number.isFinite(order.readyAt)) {
    return 0;
  }

  const product = getProduct(order.productId);
  const duration = Number.isFinite(product?.bakeDurationMs) ? product.bakeDurationMs : 0;
  if (duration <= 0) {
    return 0;
  }

  const remaining = Math.max(0, order.readyAt - Date.now());
  return Math.max(0, Math.min(100, Math.round((1 - remaining / duration) * 100)));
}

function getIngredientText(product) {
  const ingredients = product?.bakeIngredients || {};
  return Object.entries(ingredients)
    .map(([productId, quantity]) => `${getProduct(productId)?.marketName || "Item"} x${quantity}`)
    .join(", ");
}

function getBakeryStatusText() {
  const order = state.bakery.queue[0] || null;
  const queueCount = state.bakery.queue.length;
  const bread = getProduct("bread");

  if (!order) {
    return canBakeBread() ? "Ready to bake" : `Need ${getIngredientText(bread)}`;
  }

  const progress = getBakeryOrderProgress(order);
  return queueCount > 1 ? `Baking ${progress}% Queue ${queueCount}` : `Baking ${progress}%`;
}

export function mountBakery(container) {
  mountMovableCell(container, {
    key: "bakery",
    selector: "[data-bakery-cell]",
    dragHandle: ".bakery-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("bakery", finalPosition.left, finalPosition.top);
      return true;
    },
  });

  container.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-cell]");
    if (closeButton) {
      event.preventDefault();
      hideCell("bakery");
      setMessage("Bakery closed.");
      return;
    }

    const breadButton = event.target.closest("[data-bakery-bread]");
    if (breadButton) {
      event.preventDefault();
      bakeBread();
    }
  });

  function render() {
    if (!isBuildingBuilt("bakery")) {
      container.innerHTML = "";
      return;
    }

    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.bakery.left,
      state.cells.bakery.top
    );
    const bread = getProduct("bread");

    container.innerHTML = `
      <section class="bakery-cell" data-cell-key="bakery" data-bakery-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Bakery">
        <div class="bakery-header">
          <span class="bakery-title">
            <span class="bakery-title__icon" aria-hidden="true">🥖</span>
            <span class="bakery-title__text">Bakery</span>
          </span>
        </div>
        <div class="bakery-body">
          <button type="button" class="mill-action bakery-action ${canBakeBread() ? "" : "is-disabled"}" data-bakery-bread aria-disabled="${canBakeBread() ? "false" : "true"}">
            <span class="mill-action__name">${bread?.marketName || "Bread"}</span>
            <span class="mill-action__ingredients">${getIngredientText(bread)}</span>
            <span class="mill-action__ingredients bakery-action__status">${getBakeryStatusText()}</span>
          </button>
        </div>
      </section>
    `;
  }

  onStateChange(render);
  onProgressChange(updateProgress);
  render();
  window.addEventListener("resize", render);

  function updateProgress() {
    if (!isBuildingBuilt("bakery")) {
      return;
    }

    const status = container.querySelector(".bakery-action__status");
    if (status) {
      status.textContent = getBakeryStatusText();
    }
  }
}
