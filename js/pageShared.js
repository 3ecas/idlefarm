import { bootstrapGamePersistence } from "./persistence.js";
import { getProduct, getProductSellPrice } from "./catalog.js";
import { onStateChange, state } from "./state.js";

export const PAGE_TABS = [
  { key: "seeds", label: "Seeds", category: "seeds" },
  { key: "crops", label: "Crops", category: "crops" },
  { key: "animals", label: "Animals", category: "animals" },
  { key: "materials", label: "Materials", category: "materials" },
  { key: "products", label: "Products", category: "processed" },
];

export function initPage(render) {
  bootstrapGamePersistence();
  const statusRoot = document.getElementById("status");

  function renderFrame() {
    const moneyRoot = document.querySelector("[data-page-money]");
    if (moneyRoot) {
      moneyRoot.innerHTML = `
        <span class="money-coin" aria-hidden="true"></span>
        <span>${state.coins}</span>
      `;
    }
    if (statusRoot) {
      statusRoot.textContent = state.message;
    }
    render();
  }

  onStateChange(renderFrame);
  renderFrame();
}

export function getPageContent() {
  return document.querySelector("[data-page-content]");
}

export function formatPrice(value) {
  return `${Number(value) || 0}`;
}

export function getInventoryEntriesByCategory(category) {
  return Object.entries(state.barn.items)
    .map(([productId, quantity]) => {
      const product = getProduct(productId);
      return product && quantity > 0 && product.category === category ? { product, quantity } : null;
    })
    .filter(Boolean);
}

export function renderSection(title, body, className = "", { collapsible = false, open = true, sectionKey = "" } = {}) {
  if (collapsible) {
    return `
      <details class="page-section page-section--collapsible ${className}" data-section-key="${sectionKey}" ${open ? "open" : ""}>
        <summary class="page-section__summary">
          <span>${title}</span>
        </summary>
        <div class="page-section__body">
          ${body}
        </div>
      </details>
    `;
  }

  return `
    <section class="page-section ${className}">
      <h2>${title}</h2>
      ${body}
    </section>
  `;
}

export function renderEmpty(message = "Empty") {
  return `<div class="page-empty">${message}</div>`;
}

export function renderItemCard({ product, quantity = "", action = "", extra = "" }) {
  const price = Number(product.price) > 0 ? product.price : getProductSellPrice(product.id);
  return `
    <div class="page-item" data-item-info-product="${product.id}">
      <div class="page-item__main">
        <span class="page-item__name">${product.inventoryName || product.marketName}</span>
        ${quantity ? `<span class="page-item__meta">${quantity}</span>` : ""}
      </div>
      <div class="page-item__side">
        ${price > 0 ? `<span class="page-item__price">${formatPrice(price)}</span>` : ""}
        ${action}
      </div>
      ${extra}
    </div>
  `;
}

export function renderTabsSections(tabs, getEntries, renderEntry) {
  return tabs
    .map((tab) => {
      const entries = getEntries(tab);
      const body = entries.length > 0
        ? `<div class="page-item-grid">${entries.map(renderEntry).join("")}</div>`
        : renderEmpty();
      return renderSection(tab.label, body);
    })
    .join("");
}
