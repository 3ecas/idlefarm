import {
  getCellDragBounds,
  getFarmPlotSize,
  getFarmPlotTileById,
  getFarmPlotTileId,
  getPlotDisplayLabel,
  getPlotGrowthProgress,
  getPlotStatusLabel,
  getBarnItemQuantity,
  harvestPlot,
  moveFarmPlot,
  onProgressChange,
  onStateChange,
  plantSeedFromInventoryOnPlot,
  setMessage,
  state,
  waterPlot,
} from "./state.js";
import { getProduct, sortProductsByCoinValue } from "./catalog.js";
import { CROP_ITEMS } from "./seeds.js";
import { mountMovableCell, wasRecentlyDragged } from "./drag.js";

const SEED_PICKER_GAP = 8;
const SEED_PICKER_WIDTH = 172;
const SEED_PICKER_MAX_HEIGHT = 220;
const PLOT_TOOLTIP_DELAY_MS = 1500;
const PLOT_TOOLTIP_OFFSET = 14;
const PLOT_TOOLTIP_WIDTH = 178;
const PLOT_TOOLTIP_HEIGHT = 132;

let activeSeedPickerPlotId = null;

function getPlotTileIdFromElement(element) {
  return element?.closest?.("[data-plot-tile-id]")?.dataset.plotTileId || "";
}

function getPlotTileIdFromPointer(event, cell) {
  if (!cell) {
    return "";
  }

  const plot = state.farm.plots.find((entry) => entry.id === cell.dataset.cellKey);
  if (!plot) {
    return "";
  }

  const plotSize = getFarmPlotSize(plot);
  const rect = cell.getBoundingClientRect();
  const tileWidth = rect.width / plotSize.columns;
  const tileHeight = rect.height / plotSize.rows;
  if (!Number.isFinite(tileWidth) || !Number.isFinite(tileHeight) || tileWidth <= 0 || tileHeight <= 0) {
    return getFarmPlotTileId(plot.id, 0);
  }
  const column = Math.max(0, Math.min(plotSize.columns - 1, Math.floor((event.clientX - rect.left) / tileWidth)));
  const row = Math.max(0, Math.min(plotSize.rows - 1, Math.floor((event.clientY - rect.top) / tileHeight)));

  return getFarmPlotTileId(plot.id, row * plotSize.columns + column);
}

function getPlotTileIdFromEvent(event, cell = event.target.closest("[data-farm-cell]")) {
  return getPlotTileIdFromElement(event.target) || getPlotTileIdFromPointer(event, cell);
}

function getTilePosition(plot, tileIndex, workspace) {
  const plotSize = getFarmPlotSize(plot);
  const position = clampToWorkspace(workspace, plot.left, plot.top, plotSize);
  const column = tileIndex % plotSize.columns;
  const row = Math.floor(tileIndex / plotSize.columns);
  return {
    left: position.left + column * 72,
    top: position.top + row * 72,
    width: 72,
    height: 72,
  };
}

function formatRemainingTime(ms) {
  const seconds = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatProductName(productId) {
  const product = getProduct(productId);
  return product?.marketName || product?.inventoryName || "Item";
}

function getHarvestDropText(plot) {
  const plantedProduct = getProduct(plot?.cropId);
  const harvestProductId = plantedProduct?.cropProductId || plot?.cropId;
  const cropProduct = getProduct(harvestProductId);
  if (!cropProduct) {
    return "-";
  }

  const drops = [];
  const harvestQuantity = Number.isFinite(cropProduct.harvestYield) ? cropProduct.harvestYield : 1;
  drops.push(`${harvestQuantity} ${cropProduct.marketName || cropProduct.inventoryName || "Crop"}`);

  if (cropProduct.harvestDrops && typeof cropProduct.harvestDrops === "object") {
    for (const [productId, quantity] of Object.entries(cropProduct.harvestDrops)) {
      drops.push(`${quantity} ${formatProductName(productId)}`);
    }
  }

  return drops.join(", ");
}

function getPlotTooltipRows(plot) {
  if (!plot?.cropId) {
    return [{ label: "State", value: "Plant seed" }];
  }

  if (plot.stage === "planted") {
    return [{ label: "State", value: "Needs water" }];
  }

  if (plot.stage === "growing") {
    return [
      { label: "State", value: "Growing" },
      { label: "Harvest in", value: formatRemainingTime((plot.growCompleteAt || Date.now()) - Date.now()) },
    ];
  }

  if (plot.stage === "mature") {
    return [
      { label: "State", value: "Ready to harvest" },
      { label: "Drop", value: getHarvestDropText(plot) },
    ];
  }

  return [{ label: "State", value: "Plant seed" }];
}

function getPlotTooltipContent(plot) {
  const title = getPlotDisplayLabel(plot) || "Farm Plot";
  const rows = getPlotTooltipRows(plot)
    .map((row) => `
      <div class="seed-info-tooltip__row plot-info-tooltip__row">
        <span>${row.label}</span>
        <strong>${row.value}</strong>
      </div>
    `)
    .join("");

  return `
    <div class="seed-info-tooltip__title">${title}</div>
    ${rows}
  `;
}

function getPlotTooltipPosition(event) {
  return {
    left: Math.min(window.innerWidth - PLOT_TOOLTIP_WIDTH - 8, Math.max(8, event.clientX + PLOT_TOOLTIP_OFFSET)),
    top: Math.min(window.innerHeight - PLOT_TOOLTIP_HEIGHT - 8, Math.max(8, event.clientY + PLOT_TOOLTIP_OFFSET)),
  };
}

function clampToWorkspace(workspace, left, top, size = getCellDragBounds("farm")) {
  const maxLeft = Math.max(0, workspace.clientWidth - size.width);
  const maxTop = Math.max(0, workspace.clientHeight - size.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

function getPlotGlyph(plot) {
  if (!plot?.cropId) {
    return "";
  }

  const plantedProduct = getProduct(plot.cropId);
  const cropProduct = plantedProduct?.cropProductId ? getProduct(plantedProduct.cropProductId) : plantedProduct;
  return cropProduct?.icon || plantedProduct?.icon || "";
}

function getAvailableSeedEntries() {
  return CROP_ITEMS
    .map(({ seed }) => {
      const quantity = getBarnItemQuantity(seed.id);
      return quantity > 0 ? { seed, quantity } : null;
    })
    .filter(Boolean)
    .sort((first, second) => sortProductsByCoinValue(first.seed, second.seed));
}

function getSeedPickerPosition(workspace, plot, tileIndex = 0) {
  const position = getTilePosition(plot, tileIndex, workspace);
  const workspaceWidth = workspace?.clientWidth || window.innerWidth;
  const workspaceHeight = workspace?.clientHeight || window.innerHeight;
  const opensRight = position.left + position.width + SEED_PICKER_GAP + SEED_PICKER_WIDTH <= workspaceWidth - 12;
  const left = opensRight
    ? position.left + position.width + SEED_PICKER_GAP
    : Math.max(12, position.left - SEED_PICKER_WIDTH - SEED_PICKER_GAP);
  const top = Math.max(12, Math.min(position.top, workspaceHeight - SEED_PICKER_MAX_HEIGHT - 12));

  return { left, top };
}

function closeSeedPicker() {
  if (!activeSeedPickerPlotId) {
    return;
  }

  activeSeedPickerPlotId = null;
}

export function mountPlot(container) {
  let hoveredPlotId = null;
  let latestTooltipEvent = null;
  let plotTooltipElement = null;
  let plotTooltipTimer = null;
  let isPlotTooltipReady = false;

  function hidePlotTooltip() {
    hoveredPlotId = null;
    latestTooltipEvent = null;
    isPlotTooltipReady = false;
    if (plotTooltipTimer) {
      window.clearTimeout(plotTooltipTimer);
      plotTooltipTimer = null;
    }
    if (plotTooltipElement) {
      plotTooltipElement.remove();
      plotTooltipElement = null;
    }
  }

  function updatePlotTooltip(event = latestTooltipEvent) {
    if (!hoveredPlotId || !event || !isPlotTooltipReady) {
      return;
    }

    const tileRecord = getFarmPlotTileById(hoveredPlotId);
    if (!tileRecord) {
      hidePlotTooltip();
      return;
    }

    latestTooltipEvent = event;
    if (!plotTooltipElement) {
      plotTooltipElement = document.createElement("div");
      plotTooltipElement.className = "seed-info-tooltip plot-info-tooltip";
      plotTooltipElement.setAttribute("role", "tooltip");
      document.body.appendChild(plotTooltipElement);
    }

    const position = getPlotTooltipPosition(event);
    plotTooltipElement.innerHTML = getPlotTooltipContent(tileRecord.tile);
    plotTooltipElement.style.left = `${position.left}px`;
    plotTooltipElement.style.top = `${position.top}px`;
  }

  function showPlotTooltip(event) {
    const tileId = getPlotTileIdFromEvent(event);
    if (!tileId) {
      return;
    }

    hoveredPlotId = tileId;
    latestTooltipEvent = event;
    isPlotTooltipReady = false;
    if (plotTooltipTimer) {
      window.clearTimeout(plotTooltipTimer);
    }
    plotTooltipTimer = window.setTimeout(() => {
      plotTooltipTimer = null;
      isPlotTooltipReady = true;
      updatePlotTooltip();
    }, PLOT_TOOLTIP_DELAY_MS);
  }

  function movePlotTooltip(event) {
    if (!hoveredPlotId) {
      return;
    }

    latestTooltipEvent = event;
    updatePlotTooltip(event);
  }

  function leavePlotTooltip(event) {
    const tile = event.target.closest("[data-plot-tile-id]");
    if (!tile || tile.contains(event.relatedTarget)) {
      return;
    }

    hidePlotTooltip();
  }

  mountMovableCell(container, {
    key: "farm-plot",
    selector: "[data-farm-cell]",
    onDrop: (dragSnapshot, finalPosition) => {
      moveFarmPlot(dragSnapshot.key, finalPosition.left, finalPosition.top);
      return true;
    },
  });

  container.addEventListener("pointerover", showPlotTooltip);
  container.addEventListener("pointermove", movePlotTooltip);
  container.addEventListener("pointerout", leavePlotTooltip);

  container.addEventListener("click", (event) => {
    const seedButton = event.target.closest("[data-seed-choice]");
    if (seedButton) {
      event.preventDefault();
      event.stopPropagation();
      const planted = plantSeedFromInventoryOnPlot(seedButton.dataset.seedPlotId, seedButton.dataset.seedChoice);
      activeSeedPickerPlotId = null;
      if (!planted) {
        render();
      }
      return;
    }

    const cell = event.target.closest("[data-farm-cell]");
    if (!cell || wasRecentlyDragged(cell.dataset.cellKey)) {
      closeSeedPicker();
      render();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const plotTileId = getPlotTileIdFromEvent(event, cell);
    const tileRecord = getFarmPlotTileById(plotTileId);
    if (!tileRecord) {
      return;
    }
    const plot = tileRecord.tile;

    if (plot.stage === "planted") {
      closeSeedPicker();
      waterPlot(plotTileId);
      return;
    }

    if (plot.stage === "mature") {
      closeSeedPicker();
      harvestPlot(plotTileId);
      return;
    }

    if (plot.cropId) {
      closeSeedPicker();
      setMessage("Still growing.");
      return;
    }

    if (state.inventory.selectedItemId) {
      closeSeedPicker();
      plantSeedFromInventoryOnPlot(plotTileId, state.inventory.selectedItemId);
      return;
    }

    activeSeedPickerPlotId = activeSeedPickerPlotId === plotTileId ? null : plotTileId;
    render();
  });

  container.addEventListener("contextmenu", (event) => {
    const cell = event.target.closest("[data-farm-cell]");
    if (!cell) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const plotTileId = getPlotTileIdFromEvent(event, cell);
    const tileRecord = getFarmPlotTileById(plotTileId);
    if (!tileRecord || !tileRecord.tile.cropId) {
      return;
    }

    closeSeedPicker();
    if (tileRecord.tile.stage === "planted" || tileRecord.tile.stage === "growing") {
      harvestPlot(plotTileId);
      return;
    }

    setMessage("Ready to harvest.");
  });

  function render() {
    const workspace = container.closest(".workspace");
    const seedPickerTile = activeSeedPickerPlotId ? getFarmPlotTileById(activeSeedPickerPlotId) : null;
    const seedPickerPlot = seedPickerTile && !seedPickerTile.tile.cropId ? seedPickerTile.plot : null;
    if (activeSeedPickerPlotId && !seedPickerPlot) {
      activeSeedPickerPlotId = null;
    }
    const seedEntries = getAvailableSeedEntries();

    container.innerHTML = `
      ${state.farm.plots
        .map((plot) => {
          const plotSize = getFarmPlotSize(plot);
          const position = clampToWorkspace(workspace, plot.left, plot.top, plotSize);
          const isEntering = state.farm.enteringPlotIds.includes(plot.id);
          const hasGrid = plotSize.area > 1;
          const tiles = Array.isArray(plot.tiles) && plot.tiles.length === plotSize.area
            ? plot.tiles
            : Array.from({ length: plotSize.area }, () => ({ cropId: null, stage: "empty", growCompleteAt: null }));
          const ariaLabel = `${plotSize.columns} by ${plotSize.rows} land plot`;

          return `
            <div
              class="farm-cell ${hasGrid ? "farm-cell--grid" : ""} ${isEntering ? "is-entering" : ""}"
              data-cell-key="${plot.id}"
              data-farm-cell
              style="left:${position.left}px; top:${position.top}px; width:${plotSize.width}px; height:${plotSize.height}px; --plot-columns:${plotSize.columns}; --plot-rows:${plotSize.rows};"
              role="grid"
              aria-label="${ariaLabel}"
            >
              ${tiles.map((tile, tileIndex) => {
                const tileId = getFarmPlotTileId(plot.id, tileIndex);
                const stage = tile.stage || "empty";
                const nameLabel = getPlotDisplayLabel(tile);
                const statusLabel = getPlotStatusLabel(tile);
                const growthProgress = getPlotGrowthProgress(tile);
                const statusText = stage === "growing" ? "" : statusLabel;
                return `
                  <button
                    type="button"
                    class="farm-plot-tile farm-plot-tile--${stage}"
                    data-plot-tile-id="${tileId}"
                    data-stage="${stage}"
                    role="gridcell"
                    aria-label="${nameLabel ? `${nameLabel}, ${statusLabel || "planted"}` : "Empty farm spot"}"
                  >
                    <span class="farm-cell__glyph">${getPlotGlyph(tile)}</span>
                    ${statusText ? `<span class="farm-cell__status farm-cell__status--${stage}">${statusText}</span>` : ""}
                    ${
                      stage === "growing"
                        ? `
                          <span class="farm-cell__progress" aria-hidden="true">
                            <span class="farm-cell__progress-fill" style="width:${growthProgress}%"></span>
                          </span>
                        `
                        : ""
                    }
                    ${nameLabel ? `<span class="farm-cell__label">${nameLabel}</span>` : ""}
                  </button>
                `;
              }).join("")}
            </div>
          `;
        })
        .join("")}
      ${
        seedPickerPlot
          ? (() => {
              const pickerPosition = getSeedPickerPosition(workspace, seedPickerPlot, seedPickerTile?.tileIndex || 0);
              return `
                <div
                  class="seed-picker"
                  data-seed-picker
                  style="left:${pickerPosition.left}px; top:${pickerPosition.top}px;"
                >
                  <div class="seed-picker__title">Seeds</div>
                  <div class="seed-picker__list">
                    ${
                      seedEntries.length > 0
                        ? seedEntries
                            .map(({ seed, quantity }) => {
                              const crop = getProduct(seed.cropProductId);
                              return `
                                <button
                                  type="button"
                                  class="seed-picker__item"
                                  data-seed-choice="${seed.id}"
                                  data-seed-plot-id="${activeSeedPickerPlotId}"
                                >
                                  <span class="seed-picker__name">${seed.marketName}</span>
                                  <span class="seed-picker__meta">x${quantity} · ${crop?.growDurationMs ? `${Math.round(crop.growDurationMs / 1000)}s` : ""}</span>
                                </button>
                              `;
                            })
                            .join("")
                        : `<div class="seed-picker__empty">No seeds</div>`
                    }
                  </div>
                </div>
              `;
            })()
          : ""
      }
    `;
  }

  onStateChange(() => {
    render();
    updatePlotTooltip();
  });
  onProgressChange(updateProgress);
  render();
  window.addEventListener("resize", render);

  document.addEventListener("pointerdown", (event) => {
    if (!activeSeedPickerPlotId) {
      return;
    }

    if (event.target.closest("[data-seed-picker]") || event.target.closest("[data-farm-cell]")) {
      return;
    }

    closeSeedPicker();
    render();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !activeSeedPickerPlotId) {
      return;
    }

    closeSeedPicker();
    render();
  });

  function updateProgress() {
    for (const plot of state.farm.plots) {
      const plotSize = getFarmPlotSize(plot);
      const tiles = Array.isArray(plot.tiles) && plot.tiles.length === plotSize.area ? plot.tiles : [];

      tiles.forEach((tile, tileIndex) => {
        if (tile.stage !== "growing") {
          return;
        }

        const tileElement = container.querySelector(`[data-plot-tile-id="${getFarmPlotTileId(plot.id, tileIndex)}"]`);
        if (!tileElement) {
          return;
        }

        const growthProgress = getPlotGrowthProgress(tile);
        const status = tileElement.querySelector(".farm-cell__status");
        const progressFill = tileElement.querySelector(".farm-cell__progress-fill");
        if (status) {
          status.textContent = `${getPlotStatusLabel(tile)} ${growthProgress}%`;
        }
        if (progressFill) {
          progressFill.style.width = `${growthProgress}%`;
        }
      });
    }

    updatePlotTooltip();
  }
}
