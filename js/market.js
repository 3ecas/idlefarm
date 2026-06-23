import {
  addShoppingItem,
  adjustSellItem,
  buyLandPlot,
  getBarnItemQuantity,
  getCellDragBounds,
  getNextLandPlotCost,
  getSellEntries,
  getSellTotal,
  hideCell,
  isCellHidden,
  moveCell,
  onStateChange,
  removeSellItem,
  sellQueuedItems,
  setMessage,
  state,
} from "./state.js";
import { MARKET_SECTIONS, getProduct, getProductSellPrice } from "./catalog.js";
import { mountMovableCell } from "./drag.js";

let marketOpen = false;
let activeMarketTab = "seeds";

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
    <button type="button" class="market-product" data-product-id="${product.id}">
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

function renderSellEntry(product, quantity) {
  const ownedQuantity = getBarnItemQuantity(product.id);
  const canIncrease = quantity < ownedQuantity;

  return `
    <div class="sell-item">
      <div class="sell-item__main">
        <span class="sell-item__name">${product.inventoryName}</span>
        <span class="sell-item__price">${getProductSellPrice(product.id) * quantity} coins</span>
      </div>
      <div class="sell-quantity">
        <button type="button" class="sell-quantity__button" data-sell-adjust="${product.id}" data-sell-delta="-1" aria-label="Sell fewer ${product.inventoryName}">-</button>
        <span class="sell-quantity__value">x${quantity}</span>
        <button type="button" class="sell-quantity__button" data-sell-adjust="${product.id}" data-sell-delta="1" ${canIncrease ? "" : "disabled"} aria-label="Sell more ${product.inventoryName}">+</button>
        <button type="button" class="sell-item__remove" data-remove-sell-product="${product.id}" aria-label="Remove ${product.inventoryName} from sell list">x</button>
      </div>
    </div>
  `;
}

function renderSellPanel() {
  const entries = getSellEntries();
  const total = getSellTotal();

  return `
    <div class="market-sell-drop" data-market-sell-drop>
      ${
        entries.length > 0
          ? entries.map(({ product, quantity }) => renderSellEntry(product, quantity)).join("")
          : `<div class="sell-empty">Drop crops or products here</div>`
      }
      ${
        entries.length > 0
          ? `<button type="button" class="sell-action" data-sell-items>Sell for ${total} coins</button>`
          : ""
      }
    </div>
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
  const isSelected = activeMarketTab === section.key;
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
    const closeButton = event.target.closest("[data-close-cell]");
    if (closeButton) {
      event.preventDefault();
      hideCell("market");
      setMessage("Market closed.");
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

    const toggle = event.target.closest("[data-market-toggle]");
    if (toggle) {
      event.preventDefault();
      marketOpen = !marketOpen;
      setMessage(marketOpen ? "Market open." : "Market hidden.");
      render();
      return;
    }

    const tabButton = event.target.closest("[data-market-tab]");
    if (tabButton) {
      event.preventDefault();
      activeMarketTab = tabButton.dataset.marketTab;
      render();
      return;
    }

    const adjustButton = event.target.closest("[data-sell-adjust]");
    if (adjustButton) {
      event.preventDefault();
      adjustSellItem(adjustButton.dataset.sellAdjust, Number(adjustButton.dataset.sellDelta));
      return;
    }

    const removeSellButton = event.target.closest("[data-remove-sell-product]");
    if (removeSellButton) {
      event.preventDefault();
      removeSellItem(removeSellButton.dataset.removeSellProduct);
      return;
    }

    const sellButton = event.target.closest("[data-sell-items]");
    if (sellButton) {
      event.preventDefault();
      sellQueuedItems();
    }
  });

  function render() {
    if (isCellHidden("market")) {
      container.innerHTML = "";
      return;
    }

    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.market.left,
      state.cells.market.top
    );

    const selectedSection = MARKET_SECTIONS.find((section) => section.key === activeMarketTab) || MARKET_SECTIONS[0];
    const selectedProductIds = selectedSection?.productIds || [];
    let selectedContent = selectedProductIds.map((productId) => renderProductButton(getProduct(productId))).join("");
    if (selectedSection.key === "farmUpgrades") {
      selectedContent = `${renderLandPlotButton()}${selectedContent}`;
    }
    if (selectedSection.key === "sell") {
      selectedContent = renderSellPanel();
    }

    container.innerHTML = `
      <section class="market-cell ${marketOpen ? "is-open" : "is-closed"}" data-cell-key="market" data-market-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Market">
        <div class="market-header">
          <span class="market-title">Market</span>
          <div class="cell-header-actions">
            <button type="button" class="market-toggle" data-market-toggle>${marketOpen ? "Hide" : "Show"}</button>
            <button type="button" class="cell-close" data-close-cell aria-label="Close Market">x</button>
          </div>
        </div>
        <div class="market-body ${marketOpen ? "" : "is-hidden"}">
          ${
            marketOpen
              ? `
                <div class="market-tabs" role="tablist" aria-label="Market sections">
                  ${MARKET_SECTIONS.map(renderMarketTab).join("")}
                </div>
                <div class="market-tab-panel market-${selectedSection.key}" role="tabpanel">
                  ${selectedContent}
                </div>
              `
              : ""
          }
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
