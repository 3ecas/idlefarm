import { getProductSellPrice, sortProductsByCoinValue } from "./catalog.js";
import {
  adjustSellItem,
  getBarnItemQuantity,
  getSellEntries,
  getSellTotal,
  isCellHidden,
  onStateChange,
  removeSellItem,
  sellQueuedItems,
} from "./state.js";

const SELL_MARKET_WIDTH = 260;
const SELL_MARKET_MARGIN = 16;
const SELL_MARKET_OUTER_PADDING = 16;
const SELL_MARKET_HEADER_HEIGHT = 22;
const SELL_MARKET_BODY_TOP_GAP = 6;
const SELL_MARKET_ITEM_HEIGHT = 50;
const SELL_MARKET_ITEM_GAP = 6;
const SELL_MARKET_ACTION_HEIGHT = 30;
const SELL_MARKET_EMPTY_HEIGHT = 29;

function getSellMarketBounds() {
  const entryCount = getSellEntries().length;
  const contentHeight =
    entryCount === 0
      ? SELL_MARKET_EMPTY_HEIGHT
      : entryCount * SELL_MARKET_ITEM_HEIGHT +
        entryCount * SELL_MARKET_ITEM_GAP +
        SELL_MARKET_ACTION_HEIGHT;

  return {
    width: SELL_MARKET_WIDTH,
    height:
      SELL_MARKET_OUTER_PADDING +
      SELL_MARKET_HEADER_HEIGHT +
      SELL_MARKET_BODY_TOP_GAP +
      contentHeight,
  };
}

function getFixedSellMarketPosition(workspace, bounds) {
  const width = workspace?.clientWidth || window.innerWidth || 1024;
  return {
    left: Math.max(SELL_MARKET_MARGIN, width - bounds.width - SELL_MARKET_MARGIN),
    top: SELL_MARKET_MARGIN,
  };
}

function getVisibleSellMarketHeight(workspace, bounds) {
  const height = workspace?.clientHeight || window.innerHeight || 768;
  return Math.min(bounds.height, Math.max(120, height - SELL_MARKET_MARGIN * 2));
}

function renderSellEntry(product, quantity) {
  const ownedQuantity = getBarnItemQuantity(product.id);
  const canIncrease = ownedQuantity > 0;

  return `
    <div class="sell-item">
      <div class="sell-item__main">
        <span class="sell-item__name-row">
          ${product.icon ? `<span class="item-icon sell-item__icon" aria-hidden="true">${product.icon}</span>` : ""}
          <span class="sell-item__name">${product.inventoryName}</span>
        </span>
        <span class="sell-item__price">${getProductSellPrice(product.id) * quantity} coins</span>
      </div>
      <div class="sell-quantity">
        <button type="button" class="sell-quantity__button" data-sell-adjust="${product.id}" data-sell-delta="-1" aria-label="Sell fewer ${product.inventoryName}">-</button>
        <span class="sell-quantity__value">x${quantity}</span>
        <button type="button" class="sell-quantity__button" data-sell-adjust="${product.id}" data-sell-delta="1" ${canIncrease ? "" : "disabled"} aria-label="Sell more ${product.inventoryName}">+</button>
        ${canIncrease ? `<button type="button" class="sell-quantity__all" data-sell-all="${product.id}" data-sell-delta="${ownedQuantity}" aria-label="Sell all ${product.inventoryName}">all</button>` : ""}
        <button type="button" class="sell-item__remove" data-remove-sell-product="${product.id}" aria-label="Remove ${product.inventoryName} from sell list">x</button>
      </div>
    </div>
  `;
}

function renderSellPanel() {
  const entries = getSellEntries().sort((first, second) => sortProductsByCoinValue(first.product, second.product));
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

export function mountSellMarket(container) {
  container.addEventListener("click", (event) => {
    const adjustButton = event.target.closest("[data-sell-adjust]");
    if (adjustButton) {
      event.preventDefault();
      adjustSellItem(adjustButton.dataset.sellAdjust, Number(adjustButton.dataset.sellDelta));
      return;
    }

    const allButton = event.target.closest("[data-sell-all]");
    if (allButton) {
      event.preventDefault();
      adjustSellItem(allButton.dataset.sellAll, Number(allButton.dataset.sellDelta));
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
    if (isCellHidden("sellMarket")) {
      container.innerHTML = "";
      return;
    }

    const bounds = getSellMarketBounds();
    const workspace = container.closest(".workspace");
    const position = getFixedSellMarketPosition(workspace, bounds);
    const visibleHeight = getVisibleSellMarketHeight(workspace, bounds);
    const isScrollable = visibleHeight < bounds.height;

    container.innerHTML = `
      <section class="market-cell sell-market-cell ${isScrollable ? "is-scrollable" : ""} is-open" data-cell-key="sellMarket" data-sell-market-cell style="left:${position.left}px; top:${position.top}px; width:${bounds.width}px; height:${visibleHeight}px;" aria-label="Market">
        <div class="market-header">
          <span class="market-title">
            <span class="market-title__icon" aria-hidden="true">⚖</span>
            <span class="market-title__text">Market</span>
          </span>
        </div>
        <div class="market-body">
          ${renderSellPanel()}
        </div>
      </section>
    `;
  }

  onStateChange(render);
  window.addEventListener("resize", render);
  render();
}
