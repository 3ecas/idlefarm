import { getCellDragBounds, isCellHidden, isToolActive, moveCell, onStateChange, setActiveTool, state } from "./state.js";
import { mountMovableCell } from "./drag.js";

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("tools");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

const TOOL_LABELS = {
  hand: "Hand (H)",
  water: "Water (W)",
  harvest: "Cut / harvest (C)",
};

function renderToolButton(toolId, label) {
  return `
    <button
      type="button"
      class="tool-button ${isToolActive(toolId) ? "is-selected" : ""}"
      data-tool-button="${toolId}"
      aria-pressed="${isToolActive(toolId) ? "true" : "false"}"
      aria-label="${TOOL_LABELS[toolId]}"
      title="${TOOL_LABELS[toolId]}"
    >
      ${label}
    </button>
  `;
}

export function mountTools(container) {
  mountMovableCell(container, {
    key: "tools",
    selector: "[data-tools-cell]",
    dragHandle: ".tools-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("tools", finalPosition.left, finalPosition.top);
      return true;
    },
  });

  container.addEventListener("click", (event) => {
    const toolButton = event.target.closest("[data-tool-button]");
    if (!toolButton) {
      return;
    }

    event.preventDefault();
    setActiveTool(toolButton.dataset.toolButton);
  });

  function render() {
    document.body.classList.toggle("is-hand-tool-active", isToolActive("hand"));

    if (isCellHidden("tools")) {
      container.innerHTML = "";
      return;
    }

    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.tools.left,
      state.cells.tools.top
    );

    container.innerHTML = `
      <section class="tools-cell" data-cell-key="tools" data-tools-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Tools">
        <div class="tools-header">
          <span class="tools-title">Tools</span>
        </div>
        <div class="tools-body">
          ${renderToolButton("hand", "✋")}
          ${renderToolButton("water", "💧")}
          ${renderToolButton("harvest", "✂")}
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
