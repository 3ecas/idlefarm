import { getProduct } from "./catalog.js";
import { getCellDragBounds, hideCell, isCellHidden, moveCell, onStateChange, plantSeedFromInventoryOnPlot, state, setMessage } from "./state.js";
import { getInventoryEntries, handleInventorySelection, isSelectedInventoryItem } from "./inventory.js";
import { mountMovableCell } from "./drag.js";
import { addProductToSellStand, getSellCellFromPoint } from "./sell.js";

const DRAG_THRESHOLD = 4;
const DRAG_SUPPRESS_MS = 300;

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("barn");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

let barnOpen = false;
let activeSeedDrag = null;
const recentlyDraggedSeedIds = new Map();
const BARN_SECTIONS = [
  { key: "seeds", label: "Seeds", categories: ["seeds"] },
  { key: "crops", label: "Crops", categories: ["crops"] },
  { key: "materials", label: "Materials", categories: ["materials"] },
  { key: "products", label: "Products", categories: ["processed"] },
];

function markRecentlyDraggedSeed(productId) {
  recentlyDraggedSeedIds.set(productId, Date.now());
  window.setTimeout(() => {
    const recorded = recentlyDraggedSeedIds.get(productId);
    if (recorded && Date.now() - recorded >= DRAG_SUPPRESS_MS) {
      recentlyDraggedSeedIds.delete(productId);
    }
  }, DRAG_SUPPRESS_MS);
}

function wasRecentlyDraggedSeed(productId) {
  const timestamp = recentlyDraggedSeedIds.get(productId);
  if (!timestamp) {
    return false;
  }

  if (Date.now() - timestamp > DRAG_SUPPRESS_MS) {
    recentlyDraggedSeedIds.delete(productId);
    return false;
  }

  return true;
}

function clearSeedDrag() {
  if (!activeSeedDrag) {
    return;
  }

  activeSeedDrag.button.classList.remove("is-dragging");
  document.body.classList.remove("is-dragging-cell");

  try {
    activeSeedDrag.button.releasePointerCapture(activeSeedDrag.pointerId);
  } catch {
    // Best effort.
  }

  if (activeSeedDrag.ghost) {
    activeSeedDrag.ghost.remove();
  }

  activeSeedDrag = null;
}

function createSeedDragGhost(button, left, top) {
  const ghost = button.cloneNode(true);
  ghost.classList.remove("is-dragging", "is-selected");
  ghost.classList.add("inventory-item--ghost");
  ghost.setAttribute("aria-hidden", "true");
  ghost.tabIndex = -1;
  ghost.draggable = false;
  ghost.style.position = "fixed";
  ghost.style.left = `${left}px`;
  ghost.style.top = `${top}px`;
  ghost.style.width = `${button.offsetWidth}px`;
  ghost.style.height = `${button.offsetHeight}px`;
  ghost.style.pointerEvents = "none";
  ghost.style.margin = "0";
  ghost.style.zIndex = "2000";
  document.body.appendChild(ghost);
  return ghost;
}

function getFarmCellFromPoint(x, y) {
  const element = document.elementFromPoint(x, y);
  return element?.closest?.("[data-farm-cell]") || null;
}

function isSellableProduct(product) {
  return product.category === "crops" || product.category === "processed";
}

function renderInventoryItem(product, quantity) {
  if (product.category === "seeds") {
    return `
      <button
        type="button"
        class="inventory-item ${isSelectedInventoryItem(product.id) ? "is-selected" : ""}"
        data-inventory-product="${product.id}"
        draggable="false"
        data-seed-button
      >
        <span class="inventory-item__name">${product.inventoryName}</span>
        <span class="inventory-item__count">x${quantity}</span>
      </button>
    `;
  }

  if (isSellableProduct(product)) {
    return `
      <button
        type="button"
        class="inventory-item"
        data-inventory-product="${product.id}"
        data-sell-product="${product.id}"
        draggable="false"
      >
        <span class="inventory-item__name">${product.inventoryName}</span>
        <span class="inventory-item__count">x${quantity}</span>
      </button>
    `;
  }

  return `
    <div class="inventory-item inventory-item--static">
      <span class="inventory-item__name">${product.inventoryName}</span>
      <span class="inventory-item__count">x${quantity}</span>
    </div>
  `;
}

function renderBarnSection(section, entries) {
  const sectionEntries = entries.filter(({ product }) => section.categories.includes(product.category));
  return `
    <details class="barn-section barn-section--${section.key}" open>
      <summary>${section.label}</summary>
      <div class="barn-section__body">
        ${
          sectionEntries.length > 0
            ? sectionEntries.map(({ product, quantity }) => renderInventoryItem(product, quantity)).join("")
            : `<div class="inventory-item inventory-item--empty">Empty</div>`
        }
      </div>
    </details>
  `;
}

export function mountBarn(container) {
  mountMovableCell(container, {
    key: "barn",
    selector: "[data-barn-cell]",
    dragHandle: ".barn-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("barn", finalPosition.left, finalPosition.top);
      return true;
    },
  });

  container.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-cell]");
    if (closeButton) {
      event.preventDefault();
      hideCell("barn");
      setMessage("Barn closed.");
      return;
    }

    const inventoryButton = event.target.closest("[data-inventory-product]");
    if (inventoryButton) {
      event.preventDefault();
      if (wasRecentlyDraggedSeed(inventoryButton.dataset.inventoryProduct)) {
        return;
      }
      handleInventorySelection(inventoryButton.dataset.inventoryProduct);
      return;
    }

    const toggle = event.target.closest("[data-barn-toggle]");
    if (!toggle) {
      return;
    }

    event.preventDefault();
    barnOpen = !barnOpen;
    setMessage(barnOpen ? "Barn open." : "Barn hidden.");
    render();
  });

  container.addEventListener("pointerdown", (event) => {
    const inventoryButton = event.target.closest("[data-inventory-product]");
    if (!inventoryButton || event.button !== 0) {
      return;
    }

    const productId = inventoryButton.dataset.inventoryProduct;
    const product = getProduct(productId);
    if (!product || (product.category !== "seeds" && !isSellableProduct(product))) {
      return;
    }

    activeSeedDrag = {
      productId,
      target: product.category === "seeds" ? "farm" : "sell",
      button: inventoryButton,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: inventoryButton.getBoundingClientRect().left,
      startTop: inventoryButton.getBoundingClientRect().top,
      ghost: null,
      dragged: false,
    };

    event.preventDefault();

    try {
      inventoryButton.setPointerCapture(event.pointerId);
    } catch {
      // Best effort.
    }
  });

  container.addEventListener("pointermove", (event) => {
    if (!activeSeedDrag || event.pointerId !== activeSeedDrag.pointerId) {
      return;
    }

    const deltaX = event.clientX - activeSeedDrag.startX;
    const deltaY = event.clientY - activeSeedDrag.startY;

    if (!activeSeedDrag.dragged && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) {
      return;
    }

    if (!activeSeedDrag.dragged) {
      activeSeedDrag.dragged = true;
      if (activeSeedDrag.ghost) {
        activeSeedDrag.ghost.remove();
      }
      activeSeedDrag.ghost = createSeedDragGhost(
        activeSeedDrag.button,
        activeSeedDrag.startLeft,
        activeSeedDrag.startTop
      );
      activeSeedDrag.button.classList.add("is-dragging");
      document.body.classList.add("is-dragging-cell");
    }

    if (activeSeedDrag.ghost) {
      activeSeedDrag.ghost.style.left = `${activeSeedDrag.startLeft + deltaX}px`;
      activeSeedDrag.ghost.style.top = `${activeSeedDrag.startTop + deltaY}px`;
    }

    event.preventDefault();
  });

  container.addEventListener("pointerup", (event) => {
    if (!activeSeedDrag || event.pointerId !== activeSeedDrag.pointerId) {
      return;
    }

    const snapshot = activeSeedDrag;
    const wasDragged = snapshot.dragged;
    clearSeedDrag();

    if (!wasDragged) {
      return;
    }

    markRecentlyDraggedSeed(snapshot.productId);

    if (snapshot.target === "farm") {
      const farmCell = getFarmCellFromPoint(event.clientX, event.clientY);
      if (farmCell) {
        plantSeedFromInventoryOnPlot(farmCell.dataset.cellKey, snapshot.productId);
      }
    } else {
      const sellCell = getSellCellFromPoint(event.clientX, event.clientY);
      if (sellCell) {
        addProductToSellStand(snapshot.productId);
      }
    }

    event.preventDefault();
  });

  container.addEventListener("pointercancel", () => {
    clearSeedDrag();
  });

  function render() {
    if (isCellHidden("barn")) {
      container.innerHTML = "";
      return;
    }

    const entries = getInventoryEntries();
    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.barn.left,
      state.cells.barn.top
    );

    container.innerHTML = `
      <section class="barn-cell ${barnOpen ? "is-open" : "is-closed"}" data-cell-key="barn" data-barn-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Barn">
        <div class="barn-header">
          <span class="barn-title">Barn</span>
          <div class="cell-header-actions">
            <button type="button" class="barn-toggle" data-barn-toggle>${barnOpen ? "Hide" : "Show"}</button>
            <button type="button" class="cell-close" data-close-cell aria-label="Close Barn">x</button>
          </div>
        </div>
        <div class="barn-body ${barnOpen ? "" : "is-hidden"}">
          ${BARN_SECTIONS.map((section) => renderBarnSection(section, entries)).join("")}
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
