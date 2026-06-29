export const INVENTORY_TABS = [
  { key: "seeds", label: "Seeds" },
  { key: "crops", label: "Crops" },
  { key: "animals", label: "Animals" },
  { key: "materials", label: "Materials" },
  { key: "products", label: "Products" },
];

const panelTabs = new Map();

export function getPanelTab(panelKey, fallback = "seeds") {
  return panelTabs.get(panelKey) || fallback;
}

export function setPanelTab(panelKey, tabKey) {
  panelTabs.set(panelKey, tabKey);
}

export function getPanelCategory(tabKey) {
  return tabKey === "products" ? "processed" : tabKey;
}

export function renderPanelTabButtons(panelKey, activeTab, tabs = INVENTORY_TABS) {
  return tabs
    .map((tab) => {
      const isSelected = activeTab === tab.key;
      return `
        <button
          type="button"
          class="inventory-tab ${isSelected ? "is-selected" : ""}"
          data-inventory-tab="${tab.key}"
          aria-selected="${isSelected ? "true" : "false"}"
          role="tab"
        >
          ${tab.label}
        </button>
      `;
    })
    .join("");
}

export function renderInventoryTile({
  title,
  icon = "",
  meta = "",
  className = "",
  dataAttributes = "",
  isSelected = false,
  isStatic = false,
  ariaLabel = "",
  action = "",
}) {
  const displayTitle = typeof title === "string" ? title.replace(/\s+seed$/i, "") : title;
  const tagName = isStatic ? "div" : "button";
  const staticClass = isStatic ? " inventory-tile--static" : "";
  const selectedClass = isSelected ? " is-selected" : "";
  const ariaLabelAttr = ariaLabel ? ` aria-label="${ariaLabel}"` : "";
  const actionMarkup = action ? `<span class="inventory-tile__action">${action}</span>` : "";

  return `
    <${tagName}
      ${isStatic ? "" : 'type="button"'}
      class="inventory-tile ${className}${staticClass}${selectedClass}"
      ${dataAttributes}
      ${isStatic ? "" : 'draggable="false"'}
      ${ariaLabelAttr}
    >
      <span class="inventory-tile__name-row">
        ${icon ? `<span class="item-icon inventory-tile__icon" aria-hidden="true">${icon}</span>` : ""}
        <span class="inventory-tile__name">${displayTitle}</span>
      </span>
      ${meta ? `<span class="inventory-tile__meta">${meta}</span>` : ""}
      ${actionMarkup}
    </${tagName}>
  `;
}
