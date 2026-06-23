import {
  getCellDragBounds,
  getPlotDisplayLabel,
  getPlotGrowthProgress,
  getPlotStatusLabel,
  harvestPlot,
  moveFarmPlot,
  onStateChange,
  plantSelectedSeedOnPlot,
  state,
  waterPlot,
} from "./state.js";
import { mountMovableCell, wasRecentlyDragged } from "./drag.js";

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
    const cell = event.target.closest("[data-farm-cell]");
    if (!cell || wasRecentlyDragged(cell.dataset.cellKey)) {
      return;
    }

    const plotId = cell.dataset.cellKey;
    const plot = state.farm.plots.find((entry) => entry.id === plotId);
    if (!plot) {
      return;
    }

    const selectedTool = state.ui.activeTool;
    if (selectedTool === "water") {
      waterPlot(plotId);
      return;
    }

    if (selectedTool === "harvest") {
      harvestPlot(plotId);
      return;
    }

    if (selectedTool === "hand") {
      return;
    }

    plantSelectedSeedOnPlot(plotId);
  });

  function render() {
    const workspace = container.closest(".workspace");

    container.innerHTML = `
      ${state.farm.plots
        .map((plot) => {
          const position = clampToWorkspace(workspace, plot.left, plot.top);
          const isEntering = state.farm.enteringPlotIds.includes(plot.id);
          const stage = plot.stage || "empty";
          const nameLabel = getPlotDisplayLabel(plot);
          const statusLabel = getPlotStatusLabel(plot);
          const growthProgress = getPlotGrowthProgress(plot);
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
              ${statusLabel ? `<span class="farm-cell__status farm-cell__status--${stage}">${statusLabel}</span>` : ""}
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
    `;
  }

  onStateChange(render);
  render();
  window.addEventListener("resize", render);
}
