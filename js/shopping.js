import { getProduct, sortProductsByBuyPrice } from "./catalog.js";
import { hideCell, isCellHidden, onStateChange, purchaseShoppingList, removeShoppingItem, setMessage, state, showCell } from "./state.js";

const SHOPPING_WIDTH = 176;
const SHOPPING_HEIGHT = 144;
const SHOPPING_GAP = 12;
let pendingDockRender = false;

function overlaps(left, top, width, height, rect) {
  return left < rect.right && left + width > rect.left && top < rect.bottom && top + height > rect.top;
}

function collidesWithPanels(left, top, width, height, excludeKey = "shopping") {
  return Array.from(document.querySelectorAll("[data-cell-key]")).some((element) => {
    const key = element.dataset.cellKey;
    if (!key || key === excludeKey) {
      return false;
    }

    return overlaps(left, top, width, height, element.getBoundingClientRect());
  });
}

function getShoppingPosition() {
  const marketElement = document.querySelector("[data-market-cell]");
  const marketWidth = marketElement ? marketElement.offsetWidth : 160;
  const marketHeight = marketElement ? marketElement.offsetHeight : 136;
  const marketLeft = marketElement ? marketElement.offsetLeft : state.cells.market.left;
  const marketTop = marketElement ? marketElement.offsetTop : state.cells.market.top;
  const workspaceWidth = document.querySelector(".workspace")?.clientWidth || window.innerWidth;
  const workspaceHeight = document.querySelector(".workspace")?.clientHeight || window.innerHeight;

  const candidates = [
    { left: marketLeft + marketWidth + SHOPPING_GAP, top: marketTop },
    { left: marketLeft - SHOPPING_WIDTH - SHOPPING_GAP, top: marketTop },
    { left: marketLeft, top: marketTop + marketHeight + SHOPPING_GAP },
    { left: marketLeft, top: marketTop - SHOPPING_HEIGHT - SHOPPING_GAP },
  ];

  for (const candidate of candidates) {
    const left = Math.min(Math.max(0, candidate.left), Math.max(0, workspaceWidth - SHOPPING_WIDTH));
    const top = Math.min(Math.max(0, candidate.top), Math.max(0, workspaceHeight - SHOPPING_HEIGHT));

    if (!collidesWithPanels(left, top, SHOPPING_WIDTH, SHOPPING_HEIGHT)) {
      return { left, top };
    }
  }

  const fallbackLeft = Math.min(Math.max(0, marketLeft + marketWidth + SHOPPING_GAP), Math.max(0, workspaceWidth - SHOPPING_WIDTH));
  const fallbackTop = Math.max(0, Math.min(marketTop, Math.max(0, workspaceHeight - SHOPPING_HEIGHT)));

  return { left: fallbackLeft, top: fallbackTop };
}

function getShoppingEntries() {
  return Object.entries(state.shopping.items)
    .map(([productId, quantity]) => {
      const product = getProduct(productId);
      return product && quantity > 0 ? { product, quantity } : null;
    })
    .filter(Boolean)
    .sort((first, second) => sortProductsByBuyPrice(first.product, second.product));
}

export function isShoppingListOpen() {
  return !isCellHidden("shopping");
}

export function toggleShoppingList() {
  if (isCellHidden("shopping")) {
    showCell("shopping");
    setMessage("Basket opened.");
    return;
  }

  hideCell("shopping");
  setMessage("Basket closed.");
}

export function mountShopping(container) {
  window.addEventListener("idle-farm-market-moved", () => {
    scheduleDockRender();
  });

  container.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-product]");
    if (removeButton) {
      event.preventDefault();
      removeShoppingItem(removeButton.dataset.removeProduct);
      return;
    }

    const purchaseButton = event.target.closest("[data-purchase-shopping]");
    if (purchaseButton) {
      event.preventDefault();
      purchaseShoppingList();
      return;
    }

    const closeButton = event.target.closest("[data-close-cell]");
    if (closeButton) {
      event.preventDefault();
      hideCell("shopping");
      setMessage("Basket closed.");
    }
  });

  function render() {
    pendingDockRender = false;

    if (isCellHidden("shopping") || isCellHidden("market")) {
      container.innerHTML = "";
      return;
    }

    const entries = getShoppingEntries();
    const position = getShoppingPosition();
    const hasEntries = entries.length > 0;

    container.innerHTML = `
      <section class="shopping-cell" data-cell-key="shopping" data-shopping-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Basket">
        <div class="shopping-header">
          <span class="shopping-title">Basket</span>
          <button type="button" class="cell-close" data-close-cell aria-label="Close basket">x</button>
        </div>
        <div class="shopping-body">
          ${
            hasEntries
              ? entries
                  .map(
                    ({ product, quantity }) => `
                      <div class="shopping-item">
                        <div class="shopping-item__name">${product.marketName} x${quantity}</div>
                        <button
                          type="button"
                          class="shopping-item__remove"
                          data-remove-product="${product.id}"
                          aria-label="Remove one ${product.marketName}"
                        >
                          -
                        </button>
                      </div>
                    `
                  )
                  .join("")
              : `<div class="shopping-empty">Empty</div>`
          }
        </div>
        <button type="button" class="shopping-purchase" data-purchase-shopping ${hasEntries ? "" : "disabled"}>
          Purchase
        </button>
      </section>
    `;
  }

  onStateChange(render);
  render();

  function scheduleDockRender() {
    if (!container.firstElementChild || pendingDockRender) {
      return;
    }

    pendingDockRender = true;
    window.requestAnimationFrame(render);
  }
}
