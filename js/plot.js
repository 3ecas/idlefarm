import {
  getCellDragBounds,
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
import { getProduct } from "./catalog.js";
import { CROP_ITEMS } from "./seeds.js";
import { mountMovableCell, wasRecentlyDragged } from "./drag.js";

const SEED_PICKER_GAP = 8;
const SEED_PICKER_WIDTH = 172;
const SEED_PICKER_MAX_HEIGHT = 220;

let activeSeedPickerPlotId = null;

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("farm");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

function getPlotGlyph(plot) {
  if (plot.stage === "mature") {
    return "🌾";
  }

  if (plot.stage === "growing") {
    return "🌱";
  }

  return "";
}

function getAvailableSeedEntries() {
  return CROP_ITEMS
    .map(({ seed }) => {
      const quantity = getBarnItemQuantity(seed.id);
      return quantity > 0 ? { seed, quantity } : null;
    })
    .filter(Boolean);
}

function getSeedPickerPosition(workspace, plot) {
  const position = clampToWorkspace(workspace, plot.left, plot.top);
  const workspaceWidth = workspace?.clientWidth || window.innerWidth;
  const workspaceHeight = workspace?.clientHeight || window.innerHeight;
  const opensRight = position.left + 72 + SEED_PICKER_GAP + SEED_PICKER_WIDTH <= workspaceWidth - 12;
  const left = opensRight
    ? position.left + 72 + SEED_PICKER_GAP
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
  mountMovableCell(container, {
    key: "farm-plot",
    selector: "[data-farm-cell]",
    onDrop: (dragSnapshot, finalPosition) => {
      moveFarmPlot(dragSnapshot.key, finalPosition.left, finalPosition.top);
      return true;
    },
  });

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

    const plotId = cell.dataset.cellKey;
    const plot = state.farm.plots.find((entry) => entry.id === plotId);
    if (!plot) {
      return;
    }

    if (plot.stage === "planted") {
      closeSeedPicker();
      waterPlot(plotId);
      return;
    }

    if (plot.stage === "mature") {
      closeSeedPicker();
      harvestPlot(plotId);
      return;
    }

    if (plot.cropId) {
      closeSeedPicker();
      setMessage("Still growing.");
      return;
    }

    if (state.inventory.selectedItemId) {
      closeSeedPicker();
      plantSeedFromInventoryOnPlot(plotId, state.inventory.selectedItemId);
      return;
    }

    activeSeedPickerPlotId = activeSeedPickerPlotId === plotId ? null : plotId;
    render();
  });

  container.addEventListener("contextmenu", (event) => {
    const cell = event.target.closest("[data-farm-cell]");
    if (!cell) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const plot = state.farm.plots.find((entry) => entry.id === cell.dataset.cellKey);
    if (!plot || !plot.cropId) {
      return;
    }

    closeSeedPicker();
    if (plot.stage === "planted" || plot.stage === "growing") {
      harvestPlot(plot.id);
      return;
    }

    setMessage("Ready to harvest.");
  });

  function render() {
    const workspace = container.closest(".workspace");
    const seedPickerPlot = state.farm.plots.find((plot) => plot.id === activeSeedPickerPlotId && !plot.cropId) || null;
    if (activeSeedPickerPlotId && !seedPickerPlot) {
      activeSeedPickerPlotId = null;
    }
    const seedEntries = getAvailableSeedEntries();

    container.innerHTML = `
      ${state.farm.plots
        .map((plot) => {
          const position = clampToWorkspace(workspace, plot.left, plot.top);
          const isEntering = state.farm.enteringPlotIds.includes(plot.id);
          const stage = plot.stage || "empty";
          const nameLabel = getPlotDisplayLabel(plot);
          const statusLabel = getPlotStatusLabel(plot);
          const growthProgress = getPlotGrowthProgress(plot);
          const statusText = stage === "growing" ? `${statusLabel} ${growthProgress}%` : statusLabel;
          const ariaLabel = nameLabel ? `Land plot, ${nameLabel}` : "Land plot";

          return `
            <button
              type="button"
              class="farm-cell farm-cell--${stage} ${isEntering ? "is-entering" : ""}"
              data-cell-key="${plot.id}"
              data-farm-cell
              style="left:${position.left}px; top:${position.top}px;"
              aria-label="${ariaLabel}"
              data-stage="${stage}"
            >
              <span class="farm-cell__glyph">${getPlotGlyph(plot)}</span>
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
        })
        .join("")}
      ${
        seedPickerPlot
          ? (() => {
              const pickerPosition = getSeedPickerPosition(workspace, seedPickerPlot);
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
                                  data-seed-plot-id="${seedPickerPlot.id}"
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

  onStateChange(render);
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
      if (plot.stage !== "growing") {
        continue;
      }

      const cell = container.querySelector(`[data-cell-key="${plot.id}"]`);
      if (!cell) {
        continue;
      }

      const growthProgress = getPlotGrowthProgress(plot);
      const status = cell.querySelector(".farm-cell__status");
      const progressFill = cell.querySelector(".farm-cell__progress-fill");
      if (status) {
        status.textContent = `${getPlotStatusLabel(plot)} ${growthProgress}%`;
      }
      if (progressFill) {
        progressFill.style.width = `${growthProgress}%`;
      }
    }
  }
}
