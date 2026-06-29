import { ANIMAL_ITEMS } from "./animals.js";
import { MATERIALS, getProduct, getProductBuyPrice, getProductSellPrice, sortProductsByBuyPrice, sortProductsByCoinValue } from "./catalog.js";
import { attachSeedInfoTooltip } from "./seedInfoTooltip.js";
import { CROP_ITEMS } from "./seeds.js";
import { addProductToSellStand } from "./sell.js";
import { getAnimalPenDropTargetFromPoint } from "./animalPen.js";
import { getChickenCoopDropTargetFromPoint } from "./chickenCoop.js";
import {
  addAnimalFoodToPen,
  addAnimalToPen,
  addChickenFoodToCoop,
  addShoppingItem,
  bakeBread,
  buildAnimalFeeder,
  buildAnimalPen,
  buildBakery,
  buildChickenCoop,
  buildMill,
  buyLandPlot,
  canBuildAnimalFeeder,
  canBuildAnimalPen,
  canBuildBakery,
  canBuildChickenCoop,
  canBuildMill,
  adjustSellItem,
  getBarnItemQuantity,
  getFarmPlotCost,
  getSellEntries,
  getSellTotal,
  getShoppingListTotal,
  isBuildingBuilt,
  millWheatToFlour,
  onStateChange,
  purchaseShoppingList,
  removeShoppingItem,
  removeSellItem,
  sellQueuedItems,
  setShoppingItemQuantity,
  state,
} from "./state.js";
import { getInventoryEntries } from "./inventory.js";
import { renderEmpty, renderSection } from "./pageShared.js";

const BARN_DRAG_THRESHOLD = 4;
const SWITCH_ANIMATION_MS = 180;
const PANEL_TITLES = {
  dashboard: "Dashboard",
};
const DASHBOARD_SECTIONS = [
  { key: "overview", label: "Overview", icon: "▣" },
  { key: "barn", label: "Barn", icon: "📦" },
  { key: "shop", label: "Shop", icon: "🛒" },
  { key: "market", label: "Market", icon: "⚖" },
  { key: "build", label: "Build", icon: "🔨" },
];
const BUILD_ICONS = {
  bakery: "🍞",
  mill: "⚙",
  chickenCoop: "🐔",
  animalPen: "🐄",
  animalFeeder: "🪣",
  farmPlot1x1: "▦",
  farmPlot2x1: "▭",
  farmPlot2x2: "▦",
  farmPlot3x3: "▦",
};
const DASHBOARD_SHOP_SECTIONS = [
  { key: "seeds", label: "Seeds" },
  { key: "animals", label: "Animals" },
  { key: "materials", label: "Materials" },
];
const DASHBOARD_BARN_SECTIONS = [
  { key: "seeds", label: "Seeds" },
  { key: "crops", label: "Crops" },
  { key: "animals", label: "Animals" },
  { key: "materials", label: "Materials" },
  { key: "processed", label: "Products" },
];

const CATEGORY_ORDER = ["seeds", "crops", "materials", "processed", "animals"];
const BARN_SORTS = [
  { key: "category", label: "Category" },
  { key: "alphabetical", label: "A-Z" },
  { key: "sellValue", label: "Sell value" },
  { key: "quantity", label: "Amount" },
];

let activePanel = null;
let activeDashboardSection = "overview";
let activeDashboardBarnSection = null;
let activeDashboardShopSection = null;
let activeDashboardBuildSection = null;
let isDashboardBasketOpen = false;
let switchTimer = null;
let barnSortIndex = 0;
let barnItemDrag = null;
let sidePanelTooltip = null;
let dashboardRender = null;
let dashboardContentRoot = null;
let barnItemContextMenu = null;
const collapsedSections = new Set();

function getCategoryOrder(product) {
  const index = CATEGORY_ORDER.indexOf(product?.category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function getDisplayName(product) {
  if (product?.category === "seeds") {
    return (product.marketName || product.inventoryName || "").replace(/\s+seed$/i, "");
  }
  return product?.marketName || product?.inventoryName || "Item";
}

function isBarnSellableProduct(product) {
  return Boolean(product && getProductSellPrice(product.id) > 0);
}

function isBarnDraggableProduct(product) {
  return Boolean(product && (["animals", "crops", "materials", "processed"].includes(product.category) || isBarnSellableProduct(product)));
}

function formatDuration(ms) {
  const seconds = Math.round((Number(ms) || 0) / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function groupEntriesByCategory(entries) {
  return entries.reduce((groups, entry) => {
    const category = entry.product?.category || "other";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(entry);
    return groups;
  }, {});
}

function getBarnCategoryEntries() {
  return groupEntriesByCategory(getSortedBarnEntries());
}

function getShopProductsForCategory(category) {
  if (category === "seeds") {
    return CROP_ITEMS.map(({ seed }) => seed).sort(sortProductsByBuyPrice);
  }

  if (category === "crops") {
    return CROP_ITEMS.map(({ crop }) => crop).sort(sortProductsByBuyPrice);
  }

  if (category === "animals") {
    return ANIMAL_ITEMS.map(({ animal }) => animal).sort(sortProductsByBuyPrice);
  }

  if (category === "materials") {
    return Object.values(MATERIALS).sort(sortProductsByBuyPrice);
  }

  return [];
}

function getSectionIcon(sectionKey) {
  const icons = {
    seeds: "🌱",
    crops: "🥬",
    animals: "🐄",
    materials: "🪵",
    processed: "🥚",
    farmPlots: "▦",
    production: "⚙",
    buildAnimals: "🐔",
  };
  return icons[sectionKey] || "▣";
}

function getShopGrowthText(product) {
  if (product?.category === "seeds") {
    const crop = getProduct(product.cropProductId);
    return Number.isFinite(crop?.growDurationMs) ? formatDuration(crop.growDurationMs) : "—";
  }

  if (Number.isFinite(product?.growDurationMs)) {
    return formatDuration(product.growDurationMs);
  }

  if (Number.isFinite(product?.productionDurationMs)) {
    return formatDuration(product.productionDurationMs);
  }

  if (Number.isFinite(product?.bakeDurationMs)) {
    return formatDuration(product.bakeDurationMs);
  }

  return "—";
}

function getShopDropText(product) {
  if (product?.category === "seeds") {
    const crop = getProduct(product.cropProductId);
    if (!crop) {
      return "—";
    }
    return getCropDropText(crop);
  }

  if (product?.category === "crops") {
    return getCropDropText(product);
  }

  if (product?.category === "animals") {
    const output = getProduct(product.outputProductId);
    if (!output) {
      return "—";
    }
    const amount = Number.isFinite(output.productionYieldMax)
      ? output.productionYieldMax
      : Number.isFinite(output.productionYieldMin)
        ? output.productionYieldMin
        : 1;
    return `${amount} ${output.marketName}`;
  }

  return "—";
}

function getCropDropText(crop) {
  if (!crop) {
    return "—";
  }

  const drops = [];
  const amount = Number.isFinite(crop.harvestYield) ? crop.harvestYield : 1;
  drops.push(`${amount} ${crop.marketName}`);

  if (crop.harvestDrops && typeof crop.harvestDrops === "object") {
    for (const [productId, quantity] of Object.entries(crop.harvestDrops)) {
      const dropProduct = getProduct(productId);
      drops.push(`${quantity} ${dropProduct?.marketName || "Item"}`);
    }
  }

  return drops.join(", ");
}

function getSellValueText(product) {
  if (product?.category === "seeds") {
    const crop = getProduct(product.cropProductId);
    const cropSellPrice = crop ? getProductSellPrice(crop.id) : 0;
    return cropSellPrice > 0 ? `${cropSellPrice}` : "—";
  }

  const sellPrice = getProductSellPrice(product.id);
  return sellPrice > 0 ? `${sellPrice}` : "—";
}

function renderDashboardTableHeader(columns, modifierClass = "") {
  return `
    <div class="dashboard-table-header ${modifierClass}">
      ${columns.map((column) => `<span>${column}</span>`).join("")}
    </div>
  `;
}

function renderDashboardTableRow({
  product,
  quantity = "",
  columns = [],
  className = "",
  buttonAttribute = "",
  variant = "",
  rowClass = "",
  name = "",
}) {
  const tag = buttonAttribute ? "button" : "div";
  const typeAttribute = buttonAttribute ? 'type="button"' : "";
  const label = name || product.inventoryName || product.marketName || "Item";
  return `
    <${tag}
      ${typeAttribute}
      class="dashboard-table-row ${variant ? `dashboard-table-row--${variant}` : ""} ${buttonAttribute ? "dashboard-table-row--button" : ""} ${className} ${rowClass}"
      ${buttonAttribute}
      data-item-info-product="${product.id}"
    >
      <span class="dashboard-table-cell dashboard-table-cell--name">
        <span class="item-name-row dashboard-table-cell__name-row">
          ${product.icon ? `<span class="item-icon dashboard-table-cell__icon" aria-hidden="true">${product.icon}</span>` : ""}
          <span class="dashboard-table-cell__name">${label}</span>
        </span>
      </span>
      ${quantity ? `<span class="dashboard-table-cell dashboard-table-cell--quantity">${quantity}</span>` : ""}
      ${columns.map((value, index) => `<span class="dashboard-table-cell dashboard-table-cell--col${index + 1}">${value}</span>`).join("")}
    </${tag}>
  `;
}

function sectionOpen(sectionKey) {
  return !collapsedSections.has(sectionKey);
}

function renderCollapsibleSection(panelKey, sectionKey, title, body, className = "") {
  const key = `${panelKey}:${sectionKey}`;
  return renderSection(title, body, className, {
    collapsible: true,
    open: sectionOpen(key),
    sectionKey: key,
  });
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

function getBarnSellDropTargetFromPoint(x, y) {
  const element = document.elementFromPoint(x, y);
  return element?.closest?.("[data-barn-sell-drop]") || null;
}

function getDashboardMarketDropTargetFromPoint(x, y) {
  const element = document.elementFromPoint(x, y);
  return element?.closest?.("[data-dashboard-market-drop]") || null;
}

function getSortedBarnEntries() {
  const sortMode = BARN_SORTS[barnSortIndex].key;
  const entries = getInventoryEntries();

  return entries.sort((first, second) => {
    if (sortMode === "category") {
      return getCategoryOrder(first.product) - getCategoryOrder(second.product)
        || sortProductsByCoinValue(first.product, second.product);
    }

    if (sortMode === "alphabetical") {
      return getDisplayName(first.product).localeCompare(getDisplayName(second.product));
    }

    if (sortMode === "sellValue") {
      return getProductSellPrice(first.product.id) - getProductSellPrice(second.product.id)
        || getDisplayName(first.product).localeCompare(getDisplayName(second.product));
    }

    return second.quantity - first.quantity
      || getDisplayName(first.product).localeCompare(getDisplayName(second.product));
  });
}

function sortBarnEntriesForView(entries) {
  return [...entries].sort((first, second) => {
    if (barnSortIndex === 0) {
      return sortProductsByCoinValue(first.product, second.product);
    }
    if (barnSortIndex === 1) {
      return getDisplayName(first.product).localeCompare(getDisplayName(second.product));
    }
    if (barnSortIndex === 2) {
      return getProductSellPrice(first.product.id) - getProductSellPrice(second.product.id)
        || getDisplayName(first.product).localeCompare(getDisplayName(second.product));
    }
    return second.quantity - first.quantity
      || getDisplayName(first.product).localeCompare(getDisplayName(second.product));
  });
}

function renderBarnSection(section) {
  const entries = getBarnCategoryEntries()[section.key] || [];
  const body = entries.length > 0
    ? `
      <div class="dashboard-table-group" data-dashboard-anchor="barn-${section.key}">
        ${renderDashboardTableHeader(["Item", "Qty", "Sell"], "dashboard-table-header--barn")}
        <div class="dashboard-table-list">
          ${sortBarnEntriesForView(entries)
            .map(({ product, quantity }) => renderDashboardTableRow({
              product,
              quantity: `x${quantity}`,
              columns: [getProductSellPrice(product.id) > 0 ? `${getProductSellPrice(product.id)}` : "—"],
              buttonAttribute: isBarnDraggableProduct(product) ? `data-barn-drag-product="${product.id}"` : "",
              className: isBarnDraggableProduct(product) ? "dashboard-table-row--draggable" : "",
              variant: "barn",
              rowClass: `item-category-${product.category || "other"}`,
            }))
            .join("")}
        </div>
      </div>
    `
    : renderEmpty("No items");

  return renderSection(section.label, body, "dashboard-category-section");
}

function renderBarnPanel() {
  const entriesByCategory = getBarnCategoryEntries();

  if (!activeDashboardBarnSection) {
    return `
      <div class="dashboard-overview-grid dashboard-section-picker">
        ${DASHBOARD_BARN_SECTIONS
          .map((section) => {
            const count = (entriesByCategory[section.key] || []).length;
            return `
              <button type="button" class="dashboard-card dashboard-overview-card" data-barn-category="${section.key}">
                <span class="dashboard-card__header">
                  <span class="dashboard-card__title-row">
                    <span class="dashboard-card__icon" aria-hidden="true">${getSectionIcon(section.key)}</span>
                    <span class="dashboard-card__title">${section.label}</span>
                  </span>
                  <span class="dashboard-card__meta">${count} items</span>
                </span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  const sort = BARN_SORTS[barnSortIndex];
  const section = DASHBOARD_BARN_SECTIONS.find((entry) => entry.key === activeDashboardBarnSection) || DASHBOARD_BARN_SECTIONS[0];
  return `
    <div class="dashboard-view-toolbar">
      <button type="button" class="page-action dashboard-back-button" data-dashboard-back="barn">Back</button>
      <button type="button" class="page-action barn-sort-button" data-barn-sort>Sort: ${sort.label}</button>
    </div>
    <div class="dashboard-section-list">
      ${renderBarnSection(section)}
    </div>
  `;
}

function renderBarnSendToMarketDropZone() {
  if (activeDashboardSection !== "barn") {
    return "";
  }

  return `
    <button
      type="button"
      class="barn-send-to-market barn-send-to-market--fixed"
      data-barn-sell-drop
      aria-label="Send to market"
      title="Drop sellable barn items here"
    >
      <span class="barn-send-to-market__icon" aria-hidden="true">↗</span>
      <span class="barn-send-to-market__label">Send to market</span>
    </button>
  `;
}

function renderShoppingList() {
  const entries = getShoppingEntries();
  const total = getShoppingListTotal();
  const remainingCoins = Math.max(0, state.coins - total);
  const body = entries.length > 0
    ? `
      <div class="page-list">
        ${entries
          .map(({ product, quantity }) => `
            <div class="page-list-row" data-item-info-product="${product.id}">
              <span class="shopping-item__main">
                ${product.icon ? `<span class="item-icon shopping-item__icon" aria-hidden="true">${product.icon}</span>` : ""}
                <span class="shopping-item__name">${product.marketName} x${quantity}</span>
              </span>
              <span class="shopping-item__controls" aria-label="${product.marketName} basket controls">
                <button type="button" class="page-action page-action--small shopping-item__control" data-shop-remove="${product.id}" aria-label="Remove one ${product.marketName}">-</button>
                <input
                  class="shopping-item__quantity-input"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  value="${quantity}"
                  data-shop-quantity="${product.id}"
                  aria-label="${product.marketName} quantity"
                >
                <button type="button" class="page-action page-action--small shopping-item__control" data-shop-add="${product.id}" aria-label="Add one ${product.marketName}">+</button>
              </span>
            </div>
          `)
          .join("")}
      </div>
      <button type="button" class="shopping-purchase" data-shop-purchase>Purchase ${total} | ${remainingCoins} left</button>
    `
    : renderEmpty("Basket empty");

  return `
    <div class="basket-cell__content">
      ${body}
    </div>
  `;
}

function renderSellEntry(product, quantity) {
  const ownedQuantity = getBarnItemQuantity(product.id);
  const canIncrease = ownedQuantity > 0;

  return `
    <div class="sell-item dashboard-sell-item">
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

function renderMarketPanel() {
  const entries = getSellEntries().sort((first, second) => sortProductsByCoinValue(first.product, second.product));
  const total = getSellTotal();

  return `
    <div class="dashboard-card dashboard-market-card">
      <div class="dashboard-card__header">
        <div class="dashboard-card__title-row">
          <span class="dashboard-card__icon" aria-hidden="true">⚖</span>
          <span class="dashboard-card__title">Market</span>
        </div>
        <span class="dashboard-card__meta">${entries.length} items</span>
      </div>
      <div class="dashboard-market-drop" data-dashboard-market-drop>
        ${
          entries.length > 0
            ? entries.map(({ product, quantity }) => renderSellEntry(product, quantity)).join("")
            : `<div class="sell-empty">Drop crops or products here</div>`
        }
      </div>
      ${
        entries.length > 0
          ? `<button type="button" class="sell-action" data-sell-items>Sell for ${total} coins</button>`
          : ""
      }
    </div>
  `;
}

function renderShopSection(section) {
  const products = getShopProductsForCategory(section.key);
  const availableCoins = state.coins - getShoppingListTotal();
  const body = products.length > 0
    ? `
      <div class="dashboard-table-group" data-dashboard-anchor="shop-${section.key}">
        ${renderDashboardTableHeader(["Item", "Buy", "Grow", "Drop", "Sell"], "dashboard-table-header--shop")}
        <div class="dashboard-table-list">
          ${products.map((product) => {
            const buyPrice = getProductBuyPrice(product);
            const rowColumns = [
              buyPrice > 0 ? `${buyPrice}` : "—",
              getShopGrowthText(product),
              getShopDropText(product),
              getSellValueText(product),
            ];
            const canBuy = buyPrice > 0 && availableCoins >= buyPrice;
            return renderDashboardTableRow({
              product,
              columns: rowColumns,
              buttonAttribute: canBuy ? `data-shop-buy="${product.id}"` : "",
              className: `item-category-${product.category || "other"} ${canBuy ? "dashboard-table-row--buyable" : "dashboard-table-row--info dashboard-table-row--unavailable"}`,
              variant: "shop",
              rowClass: `item-category-${product.category || "other"}`,
              name: getDisplayName(product),
            });
          }).join("")}
        </div>
      </div>
    `
    : renderEmpty();

  return renderSection(section.label, body, "dashboard-category-section");
}

function renderShopPanel() {
  if (!activeDashboardShopSection) {
    return `
      <div class="dashboard-overview-grid dashboard-section-picker">
        ${DASHBOARD_SHOP_SECTIONS
          .map((section) => {
            const count = getShopProductsForCategory(section.key).length;
            const icon = section.key === "seeds" ? "🌱" : section.key === "animals" ? "🐄" : "🪵";
            return `
              <button type="button" class="dashboard-card dashboard-overview-card" data-shop-category="${section.key}">
                <span class="dashboard-card__header">
                  <span class="dashboard-card__title-row">
                    <span class="dashboard-card__icon" aria-hidden="true">${icon}</span>
                    <span class="dashboard-card__title">${section.label}</span>
                  </span>
                  <span class="dashboard-card__meta">${count} items</span>
                </span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  const section = DASHBOARD_SHOP_SECTIONS.find((entry) => entry.key === activeDashboardShopSection) || DASHBOARD_SHOP_SECTIONS[0];
  return `
    <div class="dashboard-view-toolbar">
      <button type="button" class="page-action dashboard-back-button" data-dashboard-back="shop">Back</button>
    </div>
    <div class="shop-panel-layout">
      ${renderShopSection(section)}
    </div>
  `;
}

function renderBasketPanel() {
  return `
    <div class="dashboard-card dashboard-shop-basket">
      <div class="dashboard-card__header">
        <div class="dashboard-card__title-row">
          <span class="dashboard-card__icon" aria-hidden="true">🧺</span>
          <span class="dashboard-card__title">Basket</span>
        </div>
        <span class="dashboard-card__meta">${getShoppingEntries().length} items</span>
      </div>
      ${renderShoppingList()}
    </div>
  `;
}

function getBuildSections() {
  const wood = getBarnItemQuantity("wood");
  const nails = getBarnItemQuantity("nails");
  const farmPlotOptions = [
    { id: "farmPlot1x1", label: "Single Farm Plot", columns: 1, rows: 1 },
    { id: "farmPlot2x1", label: "2x1 Farm Plot", columns: 2, rows: 1 },
    { id: "farmPlot2x2", label: "2x2 Farm Plot", columns: 2, rows: 2 },
    { id: "farmPlot3x3", label: "3x3 Farm Plot", columns: 3, rows: 3 },
  ].map((option) => {
    const costValue = getFarmPlotCost({ columns: option.columns, rows: option.rows });
    return {
      ...option,
      kind: "farmPlot",
      built: false,
      canBuild: state.coins >= costValue,
      cost: `${costValue} coins`,
    };
  });

  return [
    {
      key: "farmPlots",
      title: "Farm Plots",
      options: farmPlotOptions,
    },
    {
      key: "production",
      title: "Production",
      options: [
        {
          id: "bakery",
          label: "Bakery",
          built: isBuildingBuilt("bakery"),
          canBuild: canBuildBakery(),
          cost: `Wood ${wood}/75 - Nails ${nails}/25`,
        },
        {
          id: "mill",
          label: "Mill",
          built: isBuildingBuilt("mill"),
          canBuild: canBuildMill(),
          cost: `Wood ${wood}/35`,
        },
      ],
    },
    {
      key: "animals",
      title: "Animals",
      options: [
        {
          id: "chickenCoop",
          label: "Chicken Coop",
          built: isBuildingBuilt("chickenCoop"),
          canBuild: canBuildChickenCoop(),
          cost: `Wood ${wood}/25`,
        },
        {
          id: "animalPen",
          label: "Cow Pen",
          built: isBuildingBuilt("animalPen"),
          canBuild: canBuildAnimalPen(),
          cost: `Wood ${wood}/55`,
        },
        {
          id: "animalFeeder",
          label: "Animal Feeder",
          built: isBuildingBuilt("animalFeeder"),
          canBuild: canBuildAnimalFeeder(),
          cost: `Wood ${wood}/125 - Nails ${nails}/25`,
        },
      ],
    },
  ];
}

function renderBuildOption(option) {
  const isDisabled = option.built || !option.canBuild;
  const actionAttribute = isDisabled
    ? ""
    : option.kind === "farmPlot"
      ? `data-build-farm-plot="${option.id}" data-plot-columns="${option.columns}" data-plot-rows="${option.rows}"`
      : `data-build-page="${option.id}"`;

  return `
    <button
      type="button"
      class="page-item page-item--button build-option-cell ${option.built ? "is-built" : ""} ${isDisabled ? "is-disabled" : ""}"
      ${actionAttribute}
      ${isDisabled ? "disabled" : ""}
    >
      <div class="page-item__main">
        <span class="item-name-row page-item__name-row">
          ${BUILD_ICONS[option.id] ? `<span class="item-icon page-item__icon" aria-hidden="true">${BUILD_ICONS[option.id]}</span>` : ""}
          <span class="page-item__name">${option.label}</span>
        </span>
        <span class="page-item__meta">${option.cost}</span>
      </div>
    </button>
  `;
}

function renderBuildPanel() {
  const sections = getBuildSections();

  if (!activeDashboardBuildSection) {
    return `
      <div class="dashboard-overview-grid dashboard-section-picker">
        ${sections
          .map((section) => `
            <button type="button" class="dashboard-card dashboard-overview-card" data-build-category="${section.key}">
              <span class="dashboard-card__header">
                <span class="dashboard-card__title-row">
                  <span class="dashboard-card__icon" aria-hidden="true">${getSectionIcon(section.key)}</span>
                  <span class="dashboard-card__title">${section.title}</span>
                </span>
                <span class="dashboard-card__meta">${section.options.length} options</span>
              </span>
            </button>
          `)
          .join("")}
      </div>
    `;
  }

  const section = sections.find((entry) => entry.key === activeDashboardBuildSection) || sections[0];
  return `
    <div class="dashboard-view-toolbar">
      <button type="button" class="page-action dashboard-back-button" data-dashboard-back="build">Back</button>
    </div>
    ${renderSection(section.title, `
      <div class="page-item-grid build-option-grid">
        ${section.options.map(renderBuildOption).join("")}
      </div>
    `, "dashboard-category-section")}
  `;
}

function renderDashboardOverview() {
  const inventoryCount = getInventoryEntries().length;
  const shoppingCount = getShoppingEntries().length;
  const sellCount = getSellEntries().length;
  const builtCount = ["mill", "bakery", "animalFeeder", "animalPen", "chickenCoop"].filter((key) => isBuildingBuilt(key)).length;

  const cards = [
    { key: "barn", label: "Barn", icon: "📦", meta: `${inventoryCount} items`, detail: "Inventory and drops" },
    { key: "shop", label: "Shop", icon: "🛒", meta: `${shoppingCount} in basket`, detail: "Buy items and seeds" },
    { key: "market", label: "Market", icon: "⚖", meta: `${sellCount} queued`, detail: "Sell crops and products" },
    { key: "build", label: "Build", icon: "🔨", meta: `${builtCount} built`, detail: "Construct and expand" },
  ];

  return `
    <div class="dashboard-overview-grid">
      ${cards
        .map((card) => `
          <button type="button" class="dashboard-card dashboard-overview-card" data-dashboard-section="${card.key}">
            <span class="dashboard-card__header">
              <span class="dashboard-card__title-row">
                <span class="dashboard-card__icon" aria-hidden="true">${card.icon}</span>
                <span class="dashboard-card__title">${card.label}</span>
              </span>
              <span class="dashboard-card__meta">${card.meta}</span>
            </span>
            <span class="dashboard-card__detail">${card.detail}</span>
          </button>
        `)
        .join("")}
    </div>
  `;
}

function renderDashboardSection(sectionKey) {
  if (sectionKey === "overview") {
    return renderDashboardOverview();
  }

  if (sectionKey === "barn") {
    return renderBarnPanel();
  }

  if (sectionKey === "shop") {
    return renderShopPanel();
  }

  if (sectionKey === "market") {
    return renderMarketPanel();
  }

  if (sectionKey === "build") {
    return renderBuildPanel();
  }

  return renderDashboardOverview();
}

function renderDashboardCategorySubmenu(sectionKey) {
  return "";
}

function renderDashboardBasketDrawer() {
  return `
    <div class="dashboard-basket-drawer ${isDashboardBasketOpen ? "is-open" : ""}" ${isDashboardBasketOpen ? "" : "hidden"}>
      ${renderBasketPanel()}
    </div>
  `;
}

function renderBarnItemContextMenu() {
  if (!barnItemContextMenu) {
    return "";
  }

  const product = getProduct(barnItemContextMenu.productId);
  if (!product) {
    return "";
  }

  const animalTargetLabel = product.category === "animals"
    ? product.penBuildingId === "chickenCoop" ? "Chicken Coop" : "Cow Pen"
    : "";
  const canSendToMarket = isBarnSellableProduct(product);
  if (!animalTargetLabel && !canSendToMarket) {
    return "";
  }

  return `
    <div
      class="barn-item-context-menu"
      data-barn-context-menu
      style="left:${barnItemContextMenu.left}px; top:${barnItemContextMenu.top}px;"
    >
      ${
        animalTargetLabel
          ? `
            <button type="button" class="barn-item-context-menu__button" data-barn-context-pen="${product.id}">
              Send to ${animalTargetLabel}
            </button>
          `
          : ""
      }
      ${
        canSendToMarket && !animalTargetLabel
          ? `
            <button type="button" class="barn-item-context-menu__button" data-barn-context-send="${product.id}">
              Send to market
            </button>
          `
          : ""
      }
    </div>
  `;
}

function renderDashboardPanel() {
  const basketCount = getShoppingEntries().length;
  return `
    <div class="dashboard-layout">
      <aside class="dashboard-sidebar" aria-label="Dashboard sections">
        <div class="dashboard-sidebar__main">
          ${DASHBOARD_SECTIONS
            .map((section) => `
              <div class="dashboard-sidebar__item">
                <button
                  type="button"
                  class="dashboard-nav-button ${activeDashboardSection === section.key ? "is-active" : ""}"
                  data-dashboard-section="${section.key}"
                >
                  <span class="dashboard-nav-button__icon" aria-hidden="true">${section.icon}</span>
                  <span class="dashboard-nav-button__label">${section.label}</span>
                </button>
                ${renderDashboardCategorySubmenu(section.key)}
              </div>
            `)
            .join("")}
        </div>
      </aside>
      <div class="dashboard-top-actions">
        <button
          type="button"
          class="dashboard-basket-button ${isDashboardBasketOpen ? "is-active" : ""}"
          data-dashboard-basket-toggle
          aria-expanded="${isDashboardBasketOpen ? "true" : "false"}"
          aria-label="Open basket"
        >
          <span class="dashboard-basket-button__icon" aria-hidden="true">🧺</span>
          <span class="dashboard-basket-button__label">Basket</span>
          <span class="dashboard-basket-button__count">${basketCount}</span>
        </button>
      </div>
      <div class="dashboard-main">
        ${renderDashboardSection(activeDashboardSection)}
      </div>
      ${renderDashboardBasketDrawer()}
      ${renderBarnItemContextMenu()}
      ${renderBarnSendToMarketDropZone()}
    </div>
  `;
}

function renderPanelContent(panelKey) {
  if (panelKey === "dashboard") {
    return renderDashboardPanel();
  }

  return "";
}

function renderDashboardIfVisible() {
  if (activePanel === "dashboard" && typeof dashboardRender === "function") {
    dashboardRender();
  }
}

function scrollDashboardSection(sectionKey) {
  if (!dashboardContentRoot || !sectionKey) {
    return;
  }

  const target = dashboardContentRoot.querySelector(`[data-dashboard-anchor="${sectionKey}"]`);
  if (!target) {
    return;
  }

  window.requestAnimationFrame(() => {
    target.scrollIntoView({ block: "start" });
  });
}

function updateTabs(tabRoot, panelKey) {
  tabRoot.querySelectorAll("[data-side-tab]").forEach((button) => {
    const isActive = Boolean(panelKey && button.dataset.sideTab === panelKey);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderActivePanel(panelRoot, contentRoot, titleRoot, tabRoot) {
  if (!activePanel) {
    return;
  }

  dashboardContentRoot = contentRoot;
  panelRoot.dataset.activePanel = activePanel;
  titleRoot.textContent = PANEL_TITLES[activePanel];
  contentRoot.innerHTML = renderPanelContent(activePanel);
  panelRoot.classList.add("is-open");
  panelRoot.setAttribute("aria-hidden", "false");
  updateTabs(tabRoot, activePanel);
  if (activePanel === "dashboard" && activeDashboardSection === "shop" && activeDashboardShopSection) {
    scrollDashboardSection(`shop-${activeDashboardShopSection}`);
  }
}

function closePanel(panelRoot, tabRoot) {
  activePanel = null;
  window.clearTimeout(switchTimer);
  delete panelRoot.dataset.activePanel;
  panelRoot.classList.remove("is-open");
  panelRoot.setAttribute("aria-hidden", "true");
  updateTabs(tabRoot, null);
}

function openPanel(panelKey, panelRoot, contentRoot, titleRoot, tabRoot) {
  window.clearTimeout(switchTimer);
  if (activePanel === panelKey && panelRoot.classList.contains("is-open")) {
    closePanel(panelRoot, tabRoot);
    return;
  }

  if (activePanel && activePanel !== panelKey && panelRoot.classList.contains("is-open")) {
    panelRoot.classList.remove("is-open");
    activePanel = panelKey;
    updateTabs(tabRoot, panelKey);
    switchTimer = window.setTimeout(() => {
      renderActivePanel(panelRoot, contentRoot, titleRoot, tabRoot);
    }, SWITCH_ANIMATION_MS);
    return;
  }

  activePanel = panelKey;
  renderActivePanel(panelRoot, contentRoot, titleRoot, tabRoot);
}

function handlePanelAction(event) {
  const contextSendButton = event.target.closest("[data-barn-context-send]");
  if (contextSendButton) {
    addProductToSellStand(contextSendButton.dataset.barnContextSend);
    barnItemContextMenu = null;
    renderDashboardIfVisible();
    return;
  }

  const contextPenButton = event.target.closest("[data-barn-context-pen]");
  if (contextPenButton) {
    addAnimalToPen(contextPenButton.dataset.barnContextPen);
    barnItemContextMenu = null;
    renderDashboardIfVisible();
    return;
  }

  if (barnItemContextMenu && !event.target.closest("[data-barn-context-menu]")) {
    barnItemContextMenu = null;
    renderDashboardIfVisible();
  }

  if (event.target.closest("[data-dashboard-basket-toggle]")) {
    isDashboardBasketOpen = !isDashboardBasketOpen;
    renderDashboardIfVisible();
    return;
  }

  const backButton = event.target.closest("[data-dashboard-back]");
  if (backButton) {
    if (backButton.dataset.dashboardBack === "shop") {
      activeDashboardShopSection = null;
      renderDashboardIfVisible();
    }
    if (backButton.dataset.dashboardBack === "barn") {
      activeDashboardBarnSection = null;
      renderDashboardIfVisible();
    }
    if (backButton.dataset.dashboardBack === "build") {
      activeDashboardBuildSection = null;
      renderDashboardIfVisible();
    }
    return;
  }

  const shopCategoryButton = event.target.closest("[data-shop-category]");
  if (shopCategoryButton) {
    activeDashboardSection = "shop";
    activeDashboardShopSection = shopCategoryButton.dataset.shopCategory;
    renderDashboardIfVisible();
    scrollDashboardSection(`shop-${activeDashboardShopSection}`);
    return;
  }

  const barnCategoryButton = event.target.closest("[data-barn-category]");
  if (barnCategoryButton) {
    activeDashboardSection = "barn";
    activeDashboardBarnSection = barnCategoryButton.dataset.barnCategory;
    renderDashboardIfVisible();
    scrollDashboardSection(`barn-${activeDashboardBarnSection}`);
    return;
  }

  const buildCategoryButton = event.target.closest("[data-build-category]");
  if (buildCategoryButton) {
    activeDashboardSection = "build";
    activeDashboardBuildSection = buildCategoryButton.dataset.buildCategory;
    renderDashboardIfVisible();
    return;
  }

  const categorySectionButton = event.target.closest("[data-dashboard-category-section]");
  if (categorySectionButton) {
    activeDashboardSection = categorySectionButton.dataset.dashboardCategorySection;
    const categoryKey = categorySectionButton.dataset.dashboardCategoryKey;
    if (activeDashboardSection === "barn") {
      activeDashboardBarnSection = categoryKey;
    }
    collapsedSections.delete(`${activeDashboardSection}:${categoryKey}`);
    renderDashboardIfVisible();
    scrollDashboardSection(`${activeDashboardSection}-${categoryKey}`);
    return;
  }

  const dashboardSectionButton = event.target.closest("[data-dashboard-section]");
  if (dashboardSectionButton) {
    activeDashboardSection = dashboardSectionButton.dataset.dashboardSection;
    if (activeDashboardSection === "shop") {
      activeDashboardShopSection = null;
    }
    if (activeDashboardSection === "barn") {
      activeDashboardBarnSection = null;
    }
    if (activeDashboardSection === "build") {
      activeDashboardBuildSection = null;
    }
    renderDashboardIfVisible();
    if (activeDashboardSection === "shop" && activeDashboardShopSection) {
      scrollDashboardSection(`shop-${activeDashboardShopSection}`);
    }
    return;
  }

  if (event.target.closest("[data-barn-sort]")) {
    barnSortIndex = (barnSortIndex + 1) % BARN_SORTS.length;
    renderDashboardIfVisible();
    return;
  }

  const sellAdjustButton = event.target.closest("[data-sell-adjust]");
  if (sellAdjustButton) {
    adjustSellItem(sellAdjustButton.dataset.sellAdjust, Number(sellAdjustButton.dataset.sellDelta));
    return;
  }

  const sellAllButton = event.target.closest("[data-sell-all]");
  if (sellAllButton) {
    adjustSellItem(sellAllButton.dataset.sellAll, Number(sellAllButton.dataset.sellDelta));
    return;
  }

  const removeSellButton = event.target.closest("[data-remove-sell-product]");
  if (removeSellButton) {
    removeSellItem(removeSellButton.dataset.removeSellProduct);
    return;
  }

  if (event.target.closest("[data-sell-items]")) {
    sellQueuedItems();
    return;
  }

  const removeShoppingButton = event.target.closest("[data-shop-remove]");
  if (removeShoppingButton) {
    removeShoppingItem(removeShoppingButton.dataset.shopRemove);
    return;
  }

  const addShoppingButton = event.target.closest("[data-shop-add]");
  if (addShoppingButton) {
    addShoppingItem(addShoppingButton.dataset.shopAdd);
    return;
  }

  if (event.target.closest("[data-shop-purchase]")) {
    purchaseShoppingList();
    return;
  }

  if (event.target.closest("[data-buy-land-plot]")) {
    buyLandPlot();
    return;
  }

  const buyCell = event.target.closest("[data-shop-buy]");
  if (buyCell) {
    addShoppingItem(buyCell.dataset.shopBuy);
    activeDashboardSection = "shop";
    isDashboardBasketOpen = true;
    renderDashboardIfVisible();
    if (activeDashboardShopSection) {
      scrollDashboardSection(`shop-${activeDashboardShopSection}`);
    }
    return;
  }

  const buildFarmPlotButton = event.target.closest("[data-build-farm-plot]");
  if (buildFarmPlotButton) {
    buyLandPlot({
      columns: Number(buildFarmPlotButton.dataset.plotColumns),
      rows: Number(buildFarmPlotButton.dataset.plotRows),
    });
    return;
  }

  const buildButton = event.target.closest("[data-build-page]");
  if (!buildButton) {
    return;
  }

  const actions = {
    bakery: buildBakery,
    mill: buildMill,
    chickenCoop: buildChickenCoop,
    animalPen: buildAnimalPen,
    animalFeeder: buildAnimalFeeder,
  };
  actions[buildButton.dataset.buildPage]?.();
}

function getBarnContextMenuPosition(event) {
  const menuWidth = 148;
  const menuHeight = 42;
  const dashboardLayout = event.target.closest(".dashboard-layout") || dashboardContentRoot?.querySelector(".dashboard-layout");
  const bounds = dashboardLayout?.getBoundingClientRect();
  const originLeft = bounds?.left || 0;
  const originTop = bounds?.top || 0;
  const maxWidth = bounds?.width || window.innerWidth;
  const maxHeight = bounds?.height || window.innerHeight;
  const left = event.clientX - originLeft;
  const top = event.clientY - originTop;

  return {
    left: Math.min(maxWidth - menuWidth - 8, Math.max(8, left)),
    top: Math.min(maxHeight - menuHeight - 8, Math.max(8, top)),
  };
}

function handleBarnItemContextMenu(event) {
  const tile = event.target.closest("[data-barn-drag-product]");
  if (!tile) {
    if (barnItemContextMenu) {
      barnItemContextMenu = null;
      renderDashboardIfVisible();
    }
    return;
  }

  const product = getProduct(tile.dataset.barnDragProduct);
  if (!isBarnSellableProduct(product) && product?.category !== "animals") {
    return;
  }

  event.preventDefault();
  sidePanelTooltip?.hide();
  const position = getBarnContextMenuPosition(event);
  barnItemContextMenu = {
    productId: product.id,
    left: position.left,
    top: position.top,
  };
  renderDashboardIfVisible();
}

function clearBarnItemDrag() {
  if (!barnItemDrag) {
    return;
  }

  window.removeEventListener("pointermove", handleBarnItemPointerMove);
  window.removeEventListener("pointerup", handleBarnItemPointerUp);
  window.removeEventListener("pointercancel", handleBarnItemPointerCancel);
  barnItemDrag.tile.classList.remove("is-dragging");
  document.body.classList.remove("is-dragging-cell");

  try {
    barnItemDrag.tile.releasePointerCapture(barnItemDrag.pointerId);
  } catch {
    // Best effort.
  }

  if (barnItemDrag.ghost) {
    barnItemDrag.ghost.remove();
  }

  barnItemDrag = null;
}

function createBarnItemGhost(tile) {
  const rect = tile.getBoundingClientRect();
  const ghost = tile.cloneNode(true);
  ghost.classList.remove("is-dragging");
  ghost.classList.add("panel-item-tile--ghost");
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.position = "fixed";
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.pointerEvents = "none";
  ghost.style.margin = "0";
  ghost.style.zIndex = "5000";
  document.body.append(ghost);
  return ghost;
}

function getBuildingElementFromPoint(x, y, selector) {
  return document.elementFromPoint(x, y)?.closest?.(selector) || null;
}

function dropBarnItemIntoBuilding(productId, x, y) {
  const product = getProduct(productId);
  if (!product) {
    return false;
  }

  const animalPenDropTarget = getAnimalPenDropTargetFromPoint(x, y);
  if (animalPenDropTarget === "food") {
    return addAnimalFoodToPen(productId, 1);
  }

  if (animalPenDropTarget === "animals") {
    return product.penBuildingId === "animalPen" ? addAnimalToPen(productId) : false;
  }

  const chickenCoopDropTarget = getChickenCoopDropTargetFromPoint(x, y);
  if (chickenCoopDropTarget === "food") {
    return addChickenFoodToCoop(productId, 1);
  }

  if (chickenCoopDropTarget === "animals") {
    return product.penBuildingId === "chickenCoop" ? addAnimalToPen(productId) : false;
  }

  if (getBuildingElementFromPoint(x, y, "[data-mill-cell]")) {
    if (productId === "wheatCrop") {
      return millWheatToFlour();
    }
    return false;
  }

  if (getBuildingElementFromPoint(x, y, "[data-bakery-cell]")) {
    if (productId === "flour") {
      return bakeBread();
    }
    return false;
  }

  return false;
}

function handleBarnItemPointerDown(event) {
  const tile = event.target.closest("[data-barn-drag-product]");
  if (!tile || event.button !== 0) {
    return;
  }

  const productId = tile.dataset.barnDragProduct;
  const product = getProduct(productId);
  if (!isBarnDraggableProduct(product)) {
    return;
  }

  const rect = tile.getBoundingClientRect();
  barnItemDrag = {
    productId,
    tile,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startLeft: rect.left,
    startTop: rect.top,
    dragged: false,
    ghost: null,
  };

  try {
    tile.setPointerCapture(event.pointerId);
  } catch {
    // Best effort.
  }

  window.addEventListener("pointermove", handleBarnItemPointerMove, { passive: false });
  window.addEventListener("pointerup", handleBarnItemPointerUp);
  window.addEventListener("pointercancel", handleBarnItemPointerCancel);
}

function handleBarnItemPointerMove(event) {
  if (!barnItemDrag || event.pointerId !== barnItemDrag.pointerId) {
    return;
  }

  const deltaX = event.clientX - barnItemDrag.startX;
  const deltaY = event.clientY - barnItemDrag.startY;
  if (!barnItemDrag.dragged && Math.hypot(deltaX, deltaY) < BARN_DRAG_THRESHOLD) {
    return;
  }

  if (!barnItemDrag.dragged) {
    barnItemDrag.dragged = true;
    sidePanelTooltip?.hide();
    barnItemDrag.ghost = createBarnItemGhost(barnItemDrag.tile);
    barnItemDrag.tile.classList.add("is-dragging");
    document.body.classList.add("is-dragging-cell");
  }

  if (barnItemDrag.ghost) {
    barnItemDrag.ghost.style.left = `${barnItemDrag.startLeft + deltaX}px`;
    barnItemDrag.ghost.style.top = `${barnItemDrag.startTop + deltaY}px`;
  }

  event.preventDefault();
}

function handleBarnItemPointerUp(event) {
  if (!barnItemDrag || event.pointerId !== barnItemDrag.pointerId) {
    return;
  }

  const snapshot = barnItemDrag;
  const wasDragged = snapshot.dragged;
  clearBarnItemDrag();

  if (!wasDragged) {
    return;
  }

  if (dropBarnItemIntoBuilding(snapshot.productId, event.clientX, event.clientY)) {
    event.preventDefault();
    return;
  }

  const product = getProduct(snapshot.productId);
  if (isBarnSellableProduct(product) && getBarnSellDropTargetFromPoint(event.clientX, event.clientY)) {
    addProductToSellStand(snapshot.productId);
    renderDashboardIfVisible();
    event.preventDefault();
    return;
  }

  if (isBarnSellableProduct(product) && getDashboardMarketDropTargetFromPoint(event.clientX, event.clientY)) {
    addProductToSellStand(snapshot.productId);
    renderDashboardIfVisible();
  }

  event.preventDefault();
}

function handleBarnItemPointerCancel() {
  clearBarnItemDrag();
}

function handlePanelKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  if (event.target.closest("[data-buy-land-plot]")) {
    event.preventDefault();
    buyLandPlot();
    return;
  }

  const buyCell = event.target.closest("[data-shop-buy]");
  if (!buyCell) {
    return;
  }

  event.preventDefault();
  addShoppingItem(buyCell.dataset.shopBuy);
  activeDashboardSection = "shop";
  renderDashboardIfVisible();
  scrollDashboardSection(`shop-${activeDashboardShopSection}`);
}

function handlePanelInput(event) {
  const quantityInput = event.target.closest("[data-shop-quantity]");
  if (!quantityInput) {
    return;
  }

  setShoppingItemQuantity(quantityInput.dataset.shopQuantity, quantityInput.value);
}

export function mountSidePanels() {
  const tabRoot = document.querySelector("[data-side-tabs]");
  const panelRoot = document.querySelector("[data-side-panel]");
  const contentRoot = document.querySelector("[data-side-panel-content]");
  const titleRoot = document.querySelector("[data-side-panel-title]");
  if (!tabRoot || !panelRoot || !contentRoot || !titleRoot) {
    return;
  }

  sidePanelTooltip = attachSeedInfoTooltip(contentRoot, {
    isEnabled: (_productId, itemElement) => Boolean(itemElement?.closest(".dashboard-table-row--shop")),
  });
  updateTabs(tabRoot, null);

  const render = () => {
    if (!activePanel) {
      contentRoot.innerHTML = "";
      panelRoot.classList.remove("is-open");
      panelRoot.setAttribute("aria-hidden", "true");
      delete panelRoot.dataset.activePanel;
      return;
    }

    renderActivePanel(panelRoot, contentRoot, titleRoot, tabRoot);
  };
  dashboardRender = render;

  tabRoot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-side-tab]");
    if (!button) {
      return;
    }

    openPanel(button.dataset.sideTab, panelRoot, contentRoot, titleRoot, tabRoot);
  });

  contentRoot.addEventListener("click", handlePanelAction);
  contentRoot.addEventListener("contextmenu", handleBarnItemContextMenu);
  contentRoot.addEventListener("keydown", handlePanelKeydown);
  contentRoot.addEventListener("change", handlePanelInput);
  contentRoot.addEventListener("pointerdown", handleBarnItemPointerDown);
  contentRoot.addEventListener("toggle", (event) => {
    const section = event.target.closest?.("[data-section-key]");
    if (!section) {
      return;
    }

    if (section.open) {
      collapsedSections.delete(section.dataset.sectionKey);
      return;
    }

    collapsedSections.add(section.dataset.sectionKey);
  }, true);

  document.addEventListener("pointerdown", (event) => {
    if (!activePanel) {
      return;
    }

    const interactiveElement = event.target.closest(
      "[data-top-info-panel], [data-side-panel], [data-side-tabs], [data-basket-cell], [data-cell-key], [data-delete-zone], [data-restart-farm], button, summary, input, textarea, select, a, label"
    );
    if (interactiveElement) {
      return;
    }

    closePanel(panelRoot, tabRoot);
  }, { capture: true });

  onStateChange(render);
}
