import { getProduct, getProductSellPrice } from "./catalog.js";

function formatDuration(ms) {
  const seconds = Math.round((Number(ms) || 0) / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatProductName(productId) {
  return getProduct(productId)?.marketName || "Item";
}

function formatProductMap(items) {
  if (!items || typeof items !== "object" || Object.keys(items).length === 0) {
    return "-";
  }

  return Object.entries(items)
    .map(([productId, quantity]) => `${quantity} ${formatProductName(productId)}`)
    .join(", ");
}

function formatYield(product) {
  const min = Number.isFinite(product?.productionYieldMin) ? product.productionYieldMin : 1;
  const max = Number.isFinite(product?.productionYieldMax) ? product.productionYieldMax : min;
  return max > min ? `${min}-${max}` : `${min}`;
}

function getCropDropText(seed, crop) {
  const drops = [];
  const mainQuantity = Number.isFinite(crop?.harvestYield) ? crop.harvestYield : 1;
  drops.push(`${mainQuantity} ${crop?.marketName || seed.marketName}`);

  if (crop?.harvestDrops && typeof crop.harvestDrops === "object") {
    for (const [productId, quantity] of Object.entries(crop.harvestDrops)) {
      const product = getProduct(productId);
      drops.push(`${quantity} ${product?.marketName || "Item"}`);
    }
  }

  return drops.join(", ");
}

function renderRows(rows) {
  return rows
    .filter((row) => row.value !== undefined && row.value !== null && row.value !== "")
    .map((row) => `
      <div class="seed-info-tooltip__row">
        <span>${row.label}</span>
        <strong>${row.value}</strong>
      </div>
    `)
    .join("");
}

function getCategoryDisplayText(product) {
  if (product.category === "seeds") {
    return "Seed";
  }

  if (product.category === "crops") {
    return "Crop";
  }

  if (product.category === "animals") {
    return "Animal";
  }

  if (product.category === "materials") {
    return "Material";
  }

  if (product.category === "processed") {
    return "Product";
  }

  return "Item";
}

function getSeedRows(product) {
  const crop = product.cropProductId ? getProduct(product.cropProductId) : null;
  return [
    { label: "Price", value: product.price },
    { label: "Growing time", value: formatDuration(crop?.growDurationMs) },
    { label: "Drop", value: crop ? getCropDropText(product, crop) : "-" },
    { label: "Sell Price", value: crop ? getProductSellPrice(crop.id) : 0 },
  ];
}

function getCropRows(product) {
  return [
    { label: "Growing time", value: formatDuration(product.growDurationMs) },
    { label: "Drop", value: getCropDropText(product, product) },
    { label: "Sell Price", value: getProductSellPrice(product.id) },
  ];
}

function getAnimalRows(product) {
  const output = product.outputProductId ? getProduct(product.outputProductId) : null;
  return [
    { label: "Price", value: product.price },
    { label: "Produces", value: output?.marketName || "-" },
    { label: "Production time", value: formatDuration(output?.productionDurationMs) },
    { label: "Drop", value: output ? `${formatYield(output)} ${output.marketName}` : "-" },
    { label: "Food", value: formatProductMap(output?.foodCost) },
  ];
}

function getMaterialRows(product) {
  return [
    { label: "Price", value: product.price },
    { label: "Sell Price", value: getProductSellPrice(product.id) },
  ];
}

function getProcessedRows(product) {
  const ingredients = product.bakeIngredients || product.millIngredients || null;
  return [
    { label: "Sell Price", value: getProductSellPrice(product.id) },
    { label: "Production time", value: Number.isFinite(product.productionDurationMs) ? formatDuration(product.productionDurationMs) : "" },
    { label: "Bake time", value: Number.isFinite(product.bakeDurationMs) ? formatDuration(product.bakeDurationMs) : "" },
    { label: "Drop", value: Number.isFinite(product.productionYieldMin) || Number.isFinite(product.productionYieldMax) ? `${formatYield(product)} ${product.marketName}` : "" },
    { label: "Food", value: product.foodCost ? formatProductMap(product.foodCost) : "" },
    { label: "Ingredients", value: ingredients ? formatProductMap(ingredients) : "" },
  ];
}

function getItemRows(product) {
  const typeRow = { label: "Type", value: getCategoryDisplayText(product) };

  if (product.category === "seeds") {
    return [typeRow, ...getSeedRows(product)];
  }

  if (product.category === "crops") {
    return [typeRow, ...getCropRows(product)];
  }

  if (product.category === "animals") {
    return [typeRow, ...getAnimalRows(product)];
  }

  if (product.category === "materials") {
    return [typeRow, ...getMaterialRows(product)];
  }

  if (product.category === "processed") {
    return [typeRow, ...getProcessedRows(product)];
  }

  return [
    typeRow,
    { label: "Price", value: product.price },
    { label: "Sell Price", value: getProductSellPrice(product.id) },
  ];
}

function getItemInfoTooltipContent(productId) {
  const product = productId ? getProduct(productId) : null;
  if (!product) {
    return "";
  }

  return `
    <div class="seed-info-tooltip__title">${product.marketName}</div>
    ${renderRows(getItemRows(product))}
  `;
}

function getTooltipPosition(event) {
  const offset = 14;
  const tooltipWidth = 172;
  const tooltipHeight = 138;
  return {
    left: Math.min(window.innerWidth - tooltipWidth - 8, Math.max(8, event.clientX + offset)),
    top: Math.min(window.innerHeight - tooltipHeight - 8, Math.max(8, event.clientY + offset)),
  };
}

export function attachSeedInfoTooltip(container, { isEnabled = () => true } = {}) {
  let hoveredProductId = null;
  let tooltipElement = null;

  function hide() {
    hoveredProductId = null;
    if (tooltipElement) {
      tooltipElement.remove();
      tooltipElement = null;
    }
  }

  function update(event) {
    const content = getItemInfoTooltipContent(hoveredProductId);
    if (!content) {
      hide();
      return;
    }

    if (!tooltipElement) {
      tooltipElement = document.createElement("div");
      tooltipElement.className = "seed-info-tooltip";
      tooltipElement.setAttribute("role", "tooltip");
      document.body.appendChild(tooltipElement);
    }

    const position = getTooltipPosition(event);
    tooltipElement.innerHTML = content;
    tooltipElement.style.left = `${position.left}px`;
    tooltipElement.style.top = `${position.top}px`;
  }

  function show(event) {
    const itemElement = event.target.closest("[data-item-info-product]");
    if (!itemElement || !isEnabled(itemElement.dataset.itemInfoProduct, itemElement)) {
      return;
    }

    hoveredProductId = itemElement.dataset.itemInfoProduct;
    update(event);
  }

  function move(event) {
    if (!hoveredProductId) {
      return;
    }

    update(event);
  }

  function leave(event) {
    const itemElement = event.target.closest("[data-item-info-product]");
    if (!itemElement || itemElement.contains(event.relatedTarget)) {
      return;
    }

    hide();
  }

  container.addEventListener("pointerover", show);
  container.addEventListener("pointermove", move);
  container.addEventListener("pointerout", leave);
  container.addEventListener("mouseover", show);
  container.addEventListener("mousemove", move);
  container.addEventListener("mouseout", leave);

  return { hide };
}
