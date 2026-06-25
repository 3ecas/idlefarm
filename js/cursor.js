const STYLE_ID = "farm-cursor-style";
let contextMenuBlocked = false;

const WATER_CURSOR = makeCursor(
  `<path d="M16 4C12 9 9 13 9 18a7 7 0 0 0 14 0c0-5-3-9-7-14Z" fill="#4f8bcb" stroke="#2f6597" stroke-width="1.5"/>`,
  16,
  5
);

const HARVEST_CURSOR = makeCursor(
  `<circle cx="10" cy="22" r="3" fill="none" stroke="#5f6570" stroke-width="2"/>
   <circle cx="20" cy="22" r="3" fill="none" stroke="#5f6570" stroke-width="2"/>
   <path d="M12 20 24 8M18 20 8 8" fill="none" stroke="#5f6570" stroke-width="2" stroke-linecap="round"/>`,
  16,
  8
);

function makeCursor(markup, hotspotX, hotspotY) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" fill="transparent"/>
      ${markup}
    </svg>
  `;
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");

  return `url("data:image/svg+xml,${encoded}") ${hotspotX} ${hotspotY}, pointer`;
}

export function mountFarmCursors() {
  if (document.getElementById(STYLE_ID)) {
    blockBrowserContextMenu();
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-farm-cell][data-stage="planted"],
    [data-farm-cell][data-stage="planted"] * {
      cursor: ${WATER_CURSOR} !important;
    }

    [data-farm-cell][data-stage="mature"],
    [data-farm-cell][data-stage="mature"] * {
      cursor: ${HARVEST_CURSOR} !important;
    }
  `;
  document.head.appendChild(style);
  blockBrowserContextMenu();
}

function blockBrowserContextMenu() {
  if (contextMenuBlocked) {
    return;
  }

  contextMenuBlocked = true;
  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}
