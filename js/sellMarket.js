import { getProductSellPrice } from "./catalog.js";
import {
  adjustSellItem,
  getBarnItemQuantity,
  getCellDragBounds,
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
import { mountMovableCell } from "./drag.js";

let marketOpen = false;

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("sellMarket");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
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

export function mountSellMarket(container) {
  mountMovableCell(container, {
    key: "sellMarket",
    selector: "[data-sell-market-cell]",
    dragHandle: ".market-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("sellMarket", finalPosition.left, finalPosition.top);
      return true;
    },
  });

  container.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-cell]");
    if (closeButton) {
      event.preventDefault();
      hideCell("sellMarket");
      setMessage("Market closed.");
      return;
    }

    const toggle = event.target.closest("[data-sell-market-toggle]");
    if (toggle) {
      event.preventDefault();
      marketOpen = !marketOpen;
      setMessage(marketOpen ? "Market open." : "Market hidden.");
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
    if (isCellHidden("sellMarket")) {
      container.innerHTML = "";
      return;
    }

    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.sellMarket.left,
      state.cells.sellMarket.top
    );

    container.innerHTML = `
      <section class="market-cell sell-market-cell ${marketOpen ? "is-open" : "is-closed"}" data-cell-key="sellMarket" data-sell-market-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Market">
        <div class="market-header">
          <span class="market-title">Market</span>
          <div class="cell-header-actions">
            <button type="button" class="market-toggle" data-sell-market-toggle>${marketOpen ? "Hide" : "Show"}</button>
            <button type="button" class="cell-close" data-close-cell aria-label="Close Market">x</button>
          </div>
        </div>
        <div class="market-body ${marketOpen ? "" : "is-hidden"}">
          ${marketOpen ? renderSellPanel() : ""}
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
