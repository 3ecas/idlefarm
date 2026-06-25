import { getCellDragBounds, hideCell, isCellHidden, moveCell, onStateChange, setMessage, showCell, state } from "./state.js";
import { mountMovableCell } from "./drag.js";

const MENU_ITEMS = [
  { key: "market", label: "Market", icon: "🛒" },
  { key: "sellMarket", label: "Market", icon: "⚖" },
  { key: "barn", label: "Barn", icon: "📦" },
  { key: "fastItems", label: "Fast items", icon: "Fx" },
  { key: "money", label: "Money", icon: "🪙" },
  { key: "build", label: "Build", icon: "🔨" },
];

function clampToWorkspace(workspace, left, top) {
  const bounds = getCellDragBounds("menu");
  const maxLeft = Math.max(0, workspace.clientWidth - bounds.width);
  const maxTop = Math.max(0, workspace.clientHeight - bounds.height);

  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

function renderMenuButton(item) {
  const isOpen = !isCellHidden(item.key);
  return `
    <button
      type="button"
      class="menu-button ${isOpen ? "is-selected" : ""}"
      data-menu-cell-toggle="${item.key}"
      aria-pressed="${isOpen ? "true" : "false"}"
    >
      <span class="menu-button__icon" aria-hidden="true">${item.icon}</span>
      <span class="menu-button__label">${item.label}</span>
    </button>
  `;
}

export function mountMenu(container) {
  mountMovableCell(container, {
    key: "menu",
    selector: "[data-menu-cell]",
    dragHandle: ".menu-header",
    onDrop: (_dragSnapshot, finalPosition) => {
      moveCell("menu", finalPosition.left, finalPosition.top);
      return true;
    },
  });

  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-menu-cell-toggle]");
    if (!button) {
      return;
    }

    event.preventDefault();
    const key = button.dataset.menuCellToggle;
    const item = MENU_ITEMS.find((entry) => entry.key === key);
    if (!item) {
      return;
    }

    if (isCellHidden(key)) {
      showCell(key);
      setMessage(`${item.label} opened.`);
      return;
    }

    hideCell(key);
    setMessage(`${item.label} closed.`);
  });

  function render() {
    const position = clampToWorkspace(
      container.closest(".workspace"),
      state.cells.menu.left,
      state.cells.menu.top
    );

    container.innerHTML = `
      <section class="menu-cell" data-cell-key="menu" data-menu-cell style="left:${position.left}px; top:${position.top}px;" aria-label="Menu">
        <div class="menu-header">
          <span class="menu-title">Menu</span>
        </div>
        <div class="menu-body">
          ${MENU_ITEMS.map(renderMenuButton).join("")}
        </div>
      </section>
    `;
  }

  onStateChange(render);
  render();
}
