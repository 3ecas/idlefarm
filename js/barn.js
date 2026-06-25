import { getProduct, sortProductsByCoinValue } from "./catalog.js";
import {
  addAnimalFoodToPen,
  addAnimalToPen,
  getCellDragBounds,
  hideCell,
  isCellHidden,
  moveCell,
  onStateChange,
  plantSeedFromInventoryOnPlot,
  state,
  setMessage,
} from "./state.js";
import { getInventoryEntries, handleInventorySelection, isSelectedInventoryItem } from "./inventory.js";
import { mountMovableCell } from "./drag.js";
import { addProductToSellStand, getSellCellFromPoint } from "./sell.js";
import { getAnimalPenDropTargetFromPoint } from "./animalPen.js";
import { getChickenCoopDropTargetFromPoint } from "./chickenCoop.js";
import {
  getPanelCategory,
  getPanelTab,
  renderInventoryTile,
  renderPanelTabButtons,
  setPanelTab,
} from "./inventoryPanel.js";
import { attachSeedInfoTooltip } from "./seedInfoTooltip.js";

const DRAG_THRESHOLD = 4;
const DRAG_SUPPRESS_MS = 300;
const PANEL_KEY = "barn";
const PANEL_TITLE = "Barn";

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("barn");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

let activeSeedDrag = null;
const recentlyDraggedSeedIds = new Map();
let barnWasHidden = true;

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

  window.removeEventListener("pointermove", handleSeedDragPointerMove);
  window.removeEventListener("pointerup", handleSeedDragPointerUp);
  window.removeEventListener("pointercancel", handleSeedDragPointerCancel);
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
  ghost.classList.add("inventory-tile--ghost");
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

function handleSeedDragPointerMove(event) {
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
}

function handleSeedDragPointerUp(event) {
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
  } else if (snapshot.target === "animalPen") {
    const penTarget = getAnimalPenDropTargetFromPoint(event.clientX, event.clientY);
    if (penTarget === "animals") {
      addAnimalToPen(snapshot.productId);
    }
  } else if (snapshot.target === "chickenCoop") {
    const penTarget = getChickenCoopDropTargetFromPoint(event.clientX, event.clientY);
    if (penTarget === "animals") {
      addAnimalToPen(snapshot.productId);
    }
  } else if (snapshot.target === "animalFood") {
    const penTarget = getAnimalPenDropTargetFromPoint(event.clientX, event.clientY);
    if (penTarget === "food") {
      addAnimalFoodToPen(snapshot.productId);
    }
  } else {
    const sellCell = getSellCellFromPoint(event.clientX, event.clientY);
    if (sellCell) {
      addProductToSellStand(snapshot.productId);
    }
  }

  event.preventDefault();
}

function handleSeedDragPointerCancel() {
  clearSeedDrag();
}

function isSellableProduct(product) {
  return product.category === "crops" || product.category === "processed";
}

function getActiveTab() {
  return getPanelTab(PANEL_KEY, "seeds");
}

function getPanelEntries(entries, activeTab) {
  const category = getPanelCategory(activeTab);
  return entries
    .filter(({ product }) => product.category === category)
    .sort((first, second) => sortProductsByCoinValue(first.product, second.product));
}

function renderBarnTile(product, quantity) {
  const isSeed = product.category === "seeds";
  const isAnimal = product.category === "animals";
  const isSellable = isSellableProduct(product);
  const isInteractive = isSeed || isAnimal || isSellable;
  const itemInfoAttribute = ` data-item-info-product="${product.id}"`;
  const dataAttributes = isSeed || isAnimal || isSellable
    ? `data-inventory-product="${product.id}"${itemInfoAttribute}${isSellable ? ` data-sell-product="${product.id}"` : ""}`
    : itemInfoAttribute;

  return renderInventoryTile({
    title: product.inventoryName,
    meta: `x${quantity}`,
    className: "barn-inventory-tile",
    dataAttributes,
    isSelected: isSelectedInventoryItem(product.id),
    isStatic: !isInteractive,
    ariaLabel: product.inventoryName,
  });
}

export function mountBarn(container) {
  const seedInfoTooltip = attachSeedInfoTooltip(container);

  mountMovableCell(container, {
    key: PANEL_KEY,
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
      seedInfoTooltip.hide();
      hideCell("barn");
      setMessage("Barn closed.");
      return;
    }

    const tabButton = event.target.closest("[data-inventory-tab]");
    if (tabButton) {
      event.preventDefault();
      seedInfoTooltip.hide();
      setPanelTab(PANEL_KEY, tabButton.dataset.inventoryTab);
      render();
      return;
    }

    const inventoryButton = event.target.closest("[data-inventory-product]");
    if (inventoryButton) {
      event.preventDefault();
      if (wasRecentlyDraggedSeed(inventoryButton.dataset.inventoryProduct)) {
        return;
      }

      const product = getProduct(inventoryButton.dataset.inventoryProduct);
      if (product?.category === "seeds") {
        handleInventorySelection(inventoryButton.dataset.inventoryProduct);
      }
    }
  });

  container.addEventListener("pointerdown", (event) => {
    const inventoryButton = event.target.closest("[data-inventory-product]");
    if (!inventoryButton || event.button !== 0) {
      return;
    }

    const productId = inventoryButton.dataset.inventoryProduct;
    const product = getProduct(productId);
    if (!product) {
      return;
    }

    let target = null;
    if (product.category === "seeds") {
      target = "farm";
    } else if (product.category === "animals") {
      target = product.penBuildingId === "chickenCoop" ? "chickenCoop" : "animalPen";
    } else if (product.id === "strawCrop") {
      target = "animalFood";
    } else if (isSellableProduct(product)) {
      target = "sell";
    } else {
      return;
    }

    activeSeedDrag = {
      productId,
      target,
      button: inventoryButton,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: inventoryButton.getBoundingClientRect().left,
      startTop: inventoryButton.getBoundingClientRect().top,
      ghost: null,
      dragged: false,
    };

    try {
      inventoryButton.setPointerCapture(event.pointerId);
    } catch {
      // Best effort.
    }

    window.addEventListener("pointermove", handleSeedDragPointerMove, { passive: false });
    window.addEventListener("pointerup", handleSeedDragPointerUp);
    window.addEventListener("pointercancel", handleSeedDragPointerCancel);
  });

  function render() {
    if (activeSeedDrag) {
      return;
    }

    if (isCellHidden("barn")) {
      barnWasHidden = true;
      seedInfoTooltip.hide();
      container.innerHTML = "";
      return;
    }

    if (barnWasHidden) {
      barnWasHidden = false;
    }

    const entries = getInventoryEntries();
    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.barn.left,
      state.cells.barn.top
    );
    const activeTab = getActiveTab();
    const tabEntries = getPanelEntries(entries, activeTab);

    container.innerHTML = `
      <section class="barn-cell" data-cell-key="barn" data-barn-cell style="left:${position.left}px; top:${position.top}px;" aria-label="${PANEL_TITLE}">
        <div class="barn-header">
          <span class="barn-title">
            <span class="barn-title__icon" aria-hidden="true">📦</span>
            <span class="barn-title__text">${PANEL_TITLE}</span>
          </span>
          <div class="cell-header-actions">
            <button type="button" class="cell-close" data-close-cell aria-label="Close Barn">x</button>
          </div>
        </div>
        <div class="barn-body">
          <div class="inventory-tabs" role="tablist" aria-label="Barn categories">
            ${renderPanelTabButtons(PANEL_KEY, activeTab)}
          </div>
          <div class="inventory-grid">
            ${
              tabEntries.length > 0
                ? tabEntries.map(({ product, quantity }) => renderBarnTile(product, quantity)).join("")
                : `<div class="inventory-empty">Empty</div>`
            }
          </div>
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
