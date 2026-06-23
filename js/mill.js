import {
  getBarnItemQuantity,
  getCellDragBounds,
  isBuildingBuilt,
  millWheatToFlour,
  moveCell,
  onStateChange,
  state,
} from "./state.js";
import { mountMovableCell } from "./drag.js";

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("mill");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

export function mountMill(container) {
  mountMovableCell(container, {
    key: "mill",
    selector: "[data-mill-cell]",
    dragHandle: ".mill-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("mill", finalPosition.left, finalPosition.top);
      return true;
    },
  });

  container.addEventListener("click", (event) => {
    const millButton = event.target.closest("[data-mill-wheat]");
    if (!millButton) {
      return;
    }

    event.preventDefault();
    millWheatToFlour();
  });

  function render() {
    if (!isBuildingBuilt("mill")) {
      container.innerHTML = "";
      return;
    }

    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.mill.left,
      state.cells.mill.top
    );
    const wheat = getBarnItemQuantity("wheatCrop");

    container.innerHTML = `
      <section class="mill-cell" data-cell-key="mill" data-mill-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Mill">
        <div class="mill-header">
          <span class="mill-title">Mill</span>
        </div>
        <div class="mill-body">
          <button type="button" class="mill-action ${wheat < 2 ? "is-disabled" : ""}" data-mill-wheat aria-disabled="${wheat < 2 ? "true" : "false"}">
            <span class="mill-action__name">Wheat Flour</span>
            <span class="mill-action__ingredients">Wheat x2</span>
          </button>
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
