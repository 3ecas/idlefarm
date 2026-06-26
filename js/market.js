import {
  addShoppingItem,
  buyLandPlot,
  getCellDragBounds,
  getNextLandPlotCost,
  hideCell,
  isCellHidden,
  moveCell,
  onStateChange,
  setMessage,
  state,
} from "./state.js";
import { SHOP_SECTIONS, getProduct, sortProductsByBuyPrice } from "./catalog.js";
import { mountMovableCell } from "./drag.js";
import { isShoppingListOpen, toggleShoppingList } from "./shopping.js";
import { attachSeedInfoTooltip } from "./seedInfoTooltip.js";

let activeShopTab = "seeds";

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("market");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

function renderProductButton(product) {
  return `
    <button type="button" class="market-product" data-product-id="${product.id}" data-item-info-product="${product.id}">
      <span class="market-product__name">${product.marketName}</span>
      <span class="market-product__price">
        <span class="price-coin" aria-hidden="true"></span>
        <span class="price-value">${product.price}</span>
      </span>
    </button>
  `;
}

function renderLandPlotButton() {
  const cost = getNextLandPlotCost();
  return `
    <button type="button" class="market-product market-product--upgrade" data-buy-land-plot>
      <span class="market-product__name">Land plot</span>
      <span class="market-product__price">
        <span class="price-coin" aria-hidden="true"></span>
        <span class="price-value">${cost}</span>
      </span>
    </button>
  `;
}

function getTabLabel(section) {
  if (section.key === "seeds") {
    return "Seed";
  }

  if (section.key === "farmUpgrades") {
    return "Farm";
  }

  return section.label;
}

function renderMarketTab(section) {
  const isSelected = activeShopTab === section.key;
  return `
    <button
      type="button"
      class="market-tab ${isSelected ? "is-selected" : ""}"
      data-market-tab="${section.key}"
      aria-selected="${isSelected ? "true" : "false"}"
      role="tab"
    >
      ${getTabLabel(section)}
    </button>
  `;
}

export function mountMarket(container) {
  const seedInfoTooltip = attachSeedInfoTooltip(container);

  mountMovableCell(container, {
    key: "market",
    selector: "[data-market-cell]",
    dragHandle: ".market-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("market", finalPosition.left, finalPosition.top);
      return true;
    },
  });

  container.addEventListener("click", (event) => {
    const shoppingToggleButton = event.target.closest("[data-shopping-toggle]");
    if (shoppingToggleButton) {
      event.preventDefault();
      toggleShoppingList();
      return;
    }

    const closeButton = event.target.closest("[data-close-cell]");
    if (closeButton) {
      event.preventDefault();
      seedInfoTooltip.hide();
      hideCell("market");
      setMessage("Shop closed.");
      return;
    }

    const productButton = event.target.closest("[data-product-id]");
    if (productButton) {
      addShoppingItem(productButton.dataset.productId);
      return;
    }

    const plotButton = event.target.closest("[data-buy-land-plot]");
    if (plotButton) {
      buyLandPlot();
      return;
    }

    const tabButton = event.target.closest("[data-market-tab]");
    if (tabButton) {
      event.preventDefault();
      activeShopTab = tabButton.dataset.marketTab;
      seedInfoTooltip.hide();
      render();
      return;
    }
  });

  function render() {
    if (isCellHidden("market")) {
      seedInfoTooltip.hide();
      container.innerHTML = "";
      return;
    }

    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.market.left,
      state.cells.market.top
    );

    const selectedSection = SHOP_SECTIONS.find((section) => section.key === activeShopTab) || SHOP_SECTIONS[0];
    const selectedProducts = (selectedSection?.productIds || [])
      .map((productId) => getProduct(productId))
      .filter(Boolean)
      .sort(sortProductsByBuyPrice);
    let selectedContent = selectedProducts.map((product) => renderProductButton(product)).join("");
    if (selectedSection.key === "farmUpgrades") {
      selectedContent = `${renderLandPlotButton()}${selectedContent}`;
    }

    container.innerHTML = `
      <section class="market-cell is-open" data-cell-key="market" data-market-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Shop">
        <div class="market-header">
          <span class="market-title">
            <span class="market-title__icon" aria-hidden="true">🛒</span>
            <span class="market-title__text">Shop</span>
          </span>
          <div class="cell-header-actions">
            <button
              type="button"
              class="shopping-toggle"
              data-shopping-toggle
              aria-label="${isShoppingListOpen() ? "Hide basket" : "Show basket"}"
              aria-expanded="${isShoppingListOpen() ? "true" : "false"}"
            >
              ${isShoppingListOpen() ? "-" : "+"}
            </button>
            <button type="button" class="cell-close" data-close-cell aria-label="Close Shop">x</button>
          </div>
        </div>
        <div class="market-body">
          <div class="market-tabs" role="tablist" aria-label="Shop sections">
            ${SHOP_SECTIONS.map(renderMarketTab).join("")}
          </div>
          <div class="market-tab-panel market-${selectedSection.key}" role="tabpanel">
            ${selectedContent}
          </div>
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
