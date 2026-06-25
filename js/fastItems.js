import { ALL_PRODUCTS, getProduct, sortProductsByCoinValue } from "./catalog.js";
import { addBarnItem, getCellDragBounds, hideCell, isCellHidden, moveCell, onStateChange, setMessage, state } from "./state.js";
import { mountMovableCell } from "./drag.js";
import { getPanelCategory, getPanelTab, renderInventoryTile, renderPanelTabButtons, setPanelTab } from "./inventoryPanel.js";
import { attachSeedInfoTooltip } from "./seedInfoTooltip.js";

const PANEL_KEY = "fastItems";
const PANEL_TITLE = "Fast Items";

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("fastItems");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

function getActiveTab() {
  return getPanelTab(PANEL_KEY, "seeds");
}

function getPanelEntries(activeTab) {
  const category = getPanelCategory(activeTab);
  return ALL_PRODUCTS
    .filter((product) => product.category === category)
    .sort(sortProductsByCoinValue);
}

function renderFastItemTile(product) {
  return renderInventoryTile({
    title: product.inventoryName,
    action: "+1",
    dataAttributes: `data-fast-item-product="${product.id}" data-item-info-product="${product.id}"`,
    ariaLabel: `Add ${product.inventoryName}`,
  });
}

export function mountFastItems(container) {
  const seedInfoTooltip = attachSeedInfoTooltip(container);

  mountMovableCell(container, {
    key: PANEL_KEY,
    selector: "[data-fast-items-cell]",
    dragHandle: ".fast-items-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("fastItems", finalPosition.left, finalPosition.top);
      return true;
    },
  });

  container.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-cell]");
    if (closeButton) {
      event.preventDefault();
      seedInfoTooltip.hide();
      hideCell("fastItems");
      setMessage("Fast items closed.");
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

    const itemButton = event.target.closest("[data-fast-item-product]");
    if (itemButton) {
      event.preventDefault();
      const product = getProduct(itemButton.dataset.fastItemProduct);
      if (!product) {
        return;
      }

      addBarnItem(product.id, 1);
      setMessage(`${product.inventoryName} added.`);
    }
  });

  function render() {
    if (isCellHidden("fastItems")) {
      seedInfoTooltip.hide();
      container.innerHTML = "";
      return;
    }

    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.fastItems.left,
      state.cells.fastItems.top
    );
    const activeTab = getActiveTab();
    const tabEntries = getPanelEntries(activeTab);

    container.innerHTML = `
      <section class="fast-items-cell" data-cell-key="fastItems" data-fast-items-cell style="left:${position.left}px; top:${position.top}px;" aria-label="${PANEL_TITLE}">
        <div class="fast-items-header">
          <span class="fast-items-title">
            <span class="fast-items-title__icon" aria-hidden="true">Fx</span>
            <span class="fast-items-title__text">${PANEL_TITLE}</span>
          </span>
          <div class="cell-header-actions">
            <button type="button" class="cell-close" data-close-cell aria-label="Close Fast Items">x</button>
          </div>
        </div>
        <div class="fast-items-body">
          <div class="inventory-tabs" role="tablist" aria-label="Fast items categories">
            ${renderPanelTabButtons(PANEL_KEY, activeTab)}
          </div>
          <div class="inventory-grid">
            ${tabEntries.map((product) => renderFastItemTile(product)).join("")}
          </div>
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
