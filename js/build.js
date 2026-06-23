import {
  buildMill,
  canBuildMill,
  getBarnItemQuantity,
  getCellDragBounds,
  hideCell,
  isBuildingBuilt,
  isCellHidden,
  moveCell,
  onStateChange,
  setMessage,
  state,
} from "./state.js";
import { mountMovableCell } from "./drag.js";

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("build");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

export function mountBuild(container) {
  mountMovableCell(container, {
    key: "build",
    selector: "[data-build-cell]",
    dragHandle: ".build-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("build", finalPosition.left, finalPosition.top);
      return true;
    },
  });

  container.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-cell]");
    if (closeButton) {
      event.preventDefault();
      hideCell("build");
      setMessage("Build closed.");
      return;
    }

    const millButton = event.target.closest("[data-build-mill]");
    if (millButton) {
      event.preventDefault();
      buildMill();
    }
  });

  function render() {
    if (isCellHidden("build")) {
      container.innerHTML = "";
      return;
    }

    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.build.left,
      state.cells.build.top
    );
    const millBuilt = isBuildingBuilt("mill");
    const wood = getBarnItemQuantity("wood");
    const nails = getBarnItemQuantity("nails");

    container.innerHTML = `
      <section class="build-cell" data-cell-key="build" data-build-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Build">
        <div class="build-header">
          <span class="build-title">Build</span>
          <button type="button" class="cell-close" data-close-cell aria-label="Close Build">x</button>
        </div>
        <div class="build-body">
          <button type="button" class="build-product ${millBuilt || !canBuildMill() ? "is-disabled" : ""}" data-build-mill aria-disabled="${millBuilt || !canBuildMill() ? "true" : "false"}">
            <span class="build-product__name">${millBuilt ? "Mill built" : "Mill"}</span>
            <span class="build-product__cost">Wood ${wood}/15 - Nails ${nails}/5</span>
          </button>
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
