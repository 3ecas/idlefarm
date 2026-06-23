import { getProduct, getProductSellPrice } from "./catalog.js";
import { getCellSize } from "./layout.js";

const listeners = new Set();
const growthTimers = new Map();
let growthTicker = null;
const GRID_SIZE = 24;
const FARM_PLOT_SIZE = 72;
const FARM_PLOT_SPAWN_GAP = 0;
const FARM_PLOT_BASE_COST = 10;
const FARM_PLOT_PRICE_GROWTH = 1.75;
const FARM_PLOT_STORAGE_KEY = "idle-farm-farm-plots-v2";
const FARM_PLOT_SAVE_VERSION = "4";
const FARM_GROWTH_DURATION_MS = 10000;
const FARM_STAGE_EMPTY = "empty";
const FARM_STAGE_PLANTED = "planted";
const FARM_STAGE_GROWING = "growing";
const FARM_STAGE_MATURE = "mature";
const LAYOUT_SAVE_VERSION = "7";
const STARTING_COINS = 5;
const DEFAULT_HIDDEN_CELL_KEYS = ["market", "money", "barn", "build"];
const MILL_WOOD_COST = 15;
const MILL_NAIL_COST = 5;

const STORAGE_KEYS = {
  farm: "idle-farm-farm-cell-position",
  market: "idle-farm-market-cell-position",
  money: "idle-farm-money-cell-position",
  barn: "idle-farm-barn-cell-position",
  menu: "idle-farm-menu-cell-position",
  build: "idle-farm-build-cell-position",
  mill: "idle-farm-mill-cell-position",
  millBuilt: "idle-farm-mill-built",
  tools: "idle-farm-tools-cell-position",
  farmPlots: "idle-farm-farm-plots",
  hiddenCells: "idle-farm-hidden-cells",
  layoutInitialized: "idle-farm-layout-initialized",
  layoutVersion: "idle-farm-layout-version",
  farmPlotSaveVersion: "idle-farm-farm-plots-version",
};

const DEFAULT_CELL_POSITIONS = {
  farm: readCellPosition("farm", { left: 48, top: 48 }),
  market: readCellPosition("market", { left: 144, top: 48 }),
  money: readCellPosition("money", { left: 48, top: 160 }),
  barn: readCellPosition("barn", { left: 320, top: 48 }),
  menu: readCellPosition("menu", { left: 48, top: 240 }),
  build: readCellPosition("build", { left: 48, top: 328 }),
  mill: readCellPosition("mill", { left: 248, top: 328 }),
  tools: readCellPosition("tools", { left: 48, top: 240 }),
};

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function readCellPosition(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS[key]) || "{}");
    return {
      left: Number.isFinite(parsed.left) ? parsed.left : fallback.left,
      top: Number.isFinite(parsed.top) ? parsed.top : fallback.top,
    };
  } catch {
    return fallback;
  }
}

function saveCellPosition(key, position) {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(position));
  } catch {
    // Best effort.
  }
}

function readNumber(key, fallback) {
  try {
    const parsed = Number(localStorage.getItem(STORAGE_KEYS[key]));
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveNumber(key, value) {
  try {
    localStorage.setItem(STORAGE_KEYS[key], String(value));
  } catch {
    // Best effort.
  }
}

function readFlag(key, fallback = false) {
  try {
    const value = localStorage.getItem(STORAGE_KEYS[key]);
    if (value === null) {
      return fallback;
    }
    return value === "1";
  } catch {
    return fallback;
  }
}

function saveFlag(key, value) {
  try {
    localStorage.setItem(STORAGE_KEYS[key], value ? "1" : "0");
  } catch {
    // Best effort.
  }
}

function readStringArray(key, fallback = []) {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEYS[key]);
    if (storedValue === null) {
      return [...fallback];
    }

    const parsed = JSON.parse(storedValue);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [...fallback];
  } catch {
    return [...fallback];
  }
}

function saveStringArray(key, values) {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(values));
  } catch {
    // Best effort.
  }
}

function readFarmPlots() {
  const storedVersion = localStorage.getItem(STORAGE_KEYS.farmPlotSaveVersion);
  if (storedVersion !== FARM_PLOT_SAVE_VERSION) {
    const plots = [];
    saveFarmPlots(plots);
    return plots;
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(FARM_PLOT_STORAGE_KEY) || "null");
    if (Array.isArray(parsed) && parsed.length > 0) {
      const plots = [];
      for (let index = 0; index < parsed.length; index += 1) {
        const normalized = normalizeFarmPlot(parsed[index], index, plots);
        if (normalized) {
          plots.push(normalized);
        }
      }
      saveFarmPlots(plots);
      return plots;
    }
  } catch {
    // Fall back to legacy storage.
  }

  const plots = [];
  saveFarmPlots(plots);
  return plots;
}

function saveFarmPlots(plots) {
  try {
    localStorage.setItem(FARM_PLOT_STORAGE_KEY, JSON.stringify(plots));
    saveNumber("farmPlots", plots.length);
    localStorage.setItem(STORAGE_KEYS.farmPlotSaveVersion, FARM_PLOT_SAVE_VERSION);
  } catch {
    // Best effort.
  }
}

function getWorkspaceSize() {
  const workspace = document.getElementById("workspace");
  return {
    width: workspace?.clientWidth || window.innerWidth || 1024,
    height: workspace?.clientHeight || window.innerHeight || 768,
  };
}

function getStarterLayoutPositions() {
  const workspace = getWorkspaceSize();
  const gap = 16;
  const barnSize = getCellSize("barn");
  const marketSize = getCellSize("market");
  const moneySize = getCellSize("money");
  const menuSize = getCellSize("menu");
  const buildSize = getCellSize("build");
  const millSize = getCellSize("mill");
  const toolsSize = getCellSize("tools");
  const menuLeft = Math.max(16, Math.round((workspace.width - menuSize.width) / 2));
  const toolsLeft = Math.max(16, Math.round((workspace.width - toolsSize.width) / 2));
  const desiredMenuTop = Math.round((workspace.height * 2) / 3 - menuSize.height / 2);
  const maxMenuTop = Math.max(16, workspace.height - menuSize.height - toolsSize.height - gap - 16);
  const menuTop = Math.max(16, Math.min(desiredMenuTop, maxMenuTop));
  const toolsTop = menuTop + menuSize.height + gap;
  const popupTop = Math.max(16, menuTop - Math.max(marketSize.height, barnSize.height) - gap);
  const popupBottomTop = Math.min(workspace.height - moneySize.height - 16, toolsTop + toolsSize.height + gap);
  const popupRightLeft = Math.min(
    Math.max(16, toolsLeft),
    Math.max(16, workspace.width - Math.max(buildSize.width, moneySize.width, millSize.width) - 16)
  );

  return {
    barn: { left: menuLeft, top: popupBottomTop },
    market: { left: menuLeft, top: popupTop },
    money: { left: popupRightLeft, top: popupBottomTop },
    menu: { left: menuLeft, top: menuTop },
    build: { left: popupRightLeft, top: popupTop },
    mill: { left: popupRightLeft, top: Math.min(workspace.height - millSize.height - 16, popupBottomTop + buildSize.height + gap) },
    tools: { left: toolsLeft, top: toolsTop },
  };
}

function getObstacleRects(excludePlotId = null) {
  const elements = Array.from(document.querySelectorAll("[data-cell-key]"));
  if (elements.length > 0) {
    return elements
      .filter((element) => element.dataset.cellKey !== excludePlotId)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
      });
  }

  return [
    {
      left: DEFAULT_CELL_POSITIONS.menu.left,
      top: DEFAULT_CELL_POSITIONS.menu.top,
      width: getCellSize("menu").width,
      height: getCellSize("menu").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.tools.left,
      top: DEFAULT_CELL_POSITIONS.tools.top,
      width: getCellSize("tools").width,
      height: getCellSize("tools").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.mill.left,
      top: DEFAULT_CELL_POSITIONS.mill.top,
      width: getCellSize("mill").width,
      height: getCellSize("mill").height,
    },
  ];
}

function rectsOverlapWithGap(left, top, width, height, rect, gap) {
  return (
    left < rect.left + rect.width + gap &&
    left + width + gap > rect.left &&
    top < rect.top + rect.height + gap &&
    top + height + gap > rect.top
  );
}

function isFarmPlotPositionFree(candidate, plots, excludePlotId = null) {
  const obstacles = getObstacleRects(excludePlotId).concat(
    plots
      .filter((plot) => plot.id !== excludePlotId)
      .map((plot) => ({
        left: plot.left,
        top: plot.top,
        width: FARM_PLOT_SIZE,
        height: FARM_PLOT_SIZE,
      }))
  );

  return obstacles.every(
    (rect) => !rectsOverlapWithGap(
      candidate.left,
      candidate.top,
      FARM_PLOT_SIZE,
      FARM_PLOT_SIZE,
      rect,
      FARM_PLOT_SPAWN_GAP
    )
  );
}

function clampFarmPlotToWorkspace(position) {
  const workspace = getWorkspaceSize();
  const maxLeft = Math.max(0, workspace.width - FARM_PLOT_SIZE);
  const maxTop = Math.max(0, workspace.height - FARM_PLOT_SIZE);

  return {
    left: snapToGrid(Math.min(maxLeft, Math.max(0, position.left))),
    top: snapToGrid(Math.min(maxTop, Math.max(0, position.top))),
  };
}

function createFarmPlotRecord(id, preferredPosition, existingPlots) {
  const workspace = getWorkspaceSize();
  const maxLeft = Math.max(0, workspace.width - FARM_PLOT_SIZE);
  const maxTop = Math.max(0, workspace.height - FARM_PLOT_SIZE);

  if (preferredPosition) {
    const clampedPreferred = clampFarmPlotToWorkspace(preferredPosition);
    if (isFarmPlotPositionFree(clampedPreferred, existingPlots, id)) {
      return {
        id,
        left: clampedPreferred.left,
        top: clampedPreferred.top,
      };
    }
  }

  for (let attempt = 0; attempt < 160; attempt += 1) {
    const candidate = clampFarmPlotToWorkspace({
      left: snapToGrid(Math.random() * maxLeft),
      top: snapToGrid(Math.random() * maxTop),
    });

    if (isFarmPlotPositionFree(candidate, existingPlots, id)) {
      return {
        id,
        left: candidate.left,
        top: candidate.top,
      };
    }
  }

  const gridColumns = Math.max(1, Math.floor(maxLeft / GRID_SIZE));
  const gridRows = Math.max(1, Math.floor(maxTop / GRID_SIZE));
  for (let row = 0; row <= gridRows; row += 1) {
    for (let column = 0; column <= gridColumns; column += 1) {
      const candidate = clampFarmPlotToWorkspace({
        left: snapToGrid(column * GRID_SIZE),
        top: snapToGrid(row * GRID_SIZE),
      });
      if (isFarmPlotPositionFree(candidate, existingPlots, id)) {
        return {
          id,
          left: candidate.left,
          top: candidate.top,
        };
      }
    }
  }

  const fallbackPosition = clampFarmPlotToWorkspace({
    left: DEFAULT_CELL_POSITIONS.farm.left,
    top: DEFAULT_CELL_POSITIONS.farm.top,
  });
  return {
    id,
    left: fallbackPosition.left,
    top: fallbackPosition.top,
  };
}

function normalizeFarmPlot(plot, index, existingPlots = []) {
  if (!plot) {
    return null;
  }

  const id = typeof plot.id === "string" && plot.id ? plot.id : `farm-plot-${index}`;
  const preferredPosition = {
    left: Number.isFinite(plot.left) ? plot.left : DEFAULT_CELL_POSITIONS.farm.left + index * GRID_SIZE,
    top: Number.isFinite(plot.top) ? plot.top : DEFAULT_CELL_POSITIONS.farm.top + index * GRID_SIZE,
  };
  const position = createFarmPlotRecord(id, preferredPosition, existingPlots);
  const stage = plot.stage === FARM_STAGE_PLANTED || plot.stage === FARM_STAGE_GROWING || plot.stage === FARM_STAGE_MATURE
    ? plot.stage
    : FARM_STAGE_EMPTY;
  return {
    id,
    left: position.left,
    top: position.top,
    cropId: typeof plot.cropId === "string" ? plot.cropId : null,
    stage,
    growCompleteAt: Number.isFinite(plot.growCompleteAt) ? plot.growCompleteAt : null,
  };
}

export const state = {
  coins: STARTING_COINS,
  cells: {
    farm: DEFAULT_CELL_POSITIONS.farm,
    market: DEFAULT_CELL_POSITIONS.market,
    money: DEFAULT_CELL_POSITIONS.money,
    barn: DEFAULT_CELL_POSITIONS.barn,
    menu: DEFAULT_CELL_POSITIONS.menu,
    build: DEFAULT_CELL_POSITIONS.build,
    mill: DEFAULT_CELL_POSITIONS.mill,
    tools: DEFAULT_CELL_POSITIONS.tools,
  },
  farm: {
    plots: readFarmPlots(),
    enteringPlotIds: [],
  },
  ui: {
    hiddenCellKeys: readStringArray("hiddenCells", DEFAULT_HIDDEN_CELL_KEYS),
    activeTool: null,
  },
  inventory: {
    selectedItemId: null,
  },
  shopping: {
    items: {},
  },
  sell: {
    items: {},
  },
  barn: {
    items: {},
  },
  buildings: {
    mill: readFlag("millBuilt", false),
  },
  message: "Drag the cell.",
};

hydratePlotGrowthTimers();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function onStateChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setMessage(message) {
  state.message = message;
  notify();
}

export function addCoins(amount) {
  state.coins += amount;
  state.message = `+${amount} coins.`;
  notify();
}

export function isCellHidden(key) {
  return state.ui.hiddenCellKeys.includes(key);
}

export function hideCell(key) {
  if (isCellHidden(key)) {
    return false;
  }

  state.ui.hiddenCellKeys.push(key);
  saveStringArray("hiddenCells", state.ui.hiddenCellKeys);
  notify();
  return true;
}

export function showCell(key) {
  const index = state.ui.hiddenCellKeys.indexOf(key);
  if (index === -1) {
    return false;
  }

  state.ui.hiddenCellKeys.splice(index, 1);
  saveStringArray("hiddenCells", state.ui.hiddenCellKeys);
  notify();
  return true;
}

export function moveCell(key, left, top) {
  state.cells[key].left = left;
  state.cells[key].top = top;
  saveCellPosition(key, state.cells[key]);
  notify();
}

export function applyStarterLayout(force = false) {
  const storedLayoutVersion = localStorage.getItem(STORAGE_KEYS.layoutVersion);
  if (!force && storedLayoutVersion === LAYOUT_SAVE_VERSION) {
    return false;
  }

  const layout = getStarterLayoutPositions();
  state.cells.market = layout.market;
  state.cells.money = layout.money;
  state.cells.barn = layout.barn;
  state.cells.menu = layout.menu;
  state.cells.build = layout.build;
  state.cells.mill = layout.mill;
  state.cells.tools = layout.tools;
  saveCellPosition("market", state.cells.market);
  saveCellPosition("money", state.cells.money);
  saveCellPosition("barn", state.cells.barn);
  saveCellPosition("menu", state.cells.menu);
  saveCellPosition("build", state.cells.build);
  saveCellPosition("mill", state.cells.mill);
  saveCellPosition("tools", state.cells.tools);
  if (!force && storedLayoutVersion !== LAYOUT_SAVE_VERSION) {
    state.ui.hiddenCellKeys = Array.from(new Set([...state.ui.hiddenCellKeys, ...DEFAULT_HIDDEN_CELL_KEYS]));
    saveStringArray("hiddenCells", state.ui.hiddenCellKeys);
  }
  saveFlag("layoutInitialized", true);
  try {
    localStorage.setItem(STORAGE_KEYS.layoutVersion, LAYOUT_SAVE_VERSION);
  } catch {
    // Best effort.
  }
  notify();
  return true;
}

export function getCellDragBounds(key) {
  return getCellSize(key);
}

function getPlotById(plotId) {
  return state.farm.plots.find((plot) => plot.id === plotId) || null;
}

function clearPlotGrowthTimer(plotId) {
  const timerId = growthTimers.get(plotId);
  if (timerId) {
    window.clearTimeout(timerId);
    growthTimers.delete(plotId);
  }
}

function markPlotMature(plot) {
  if (!plot) {
    return false;
  }

  clearPlotGrowthTimer(plot.id);
  plot.stage = FARM_STAGE_MATURE;
  plot.growCompleteAt = null;
  saveFarmPlots(state.farm.plots);
  if (!hasGrowingPlots() && growthTicker) {
    window.clearInterval(growthTicker);
    growthTicker = null;
  }
  notify();
  return true;
}

function schedulePlotGrowth(plot) {
  if (!plot || plot.stage !== FARM_STAGE_GROWING || !Number.isFinite(plot.growCompleteAt)) {
    return;
  }

  clearPlotGrowthTimer(plot.id);
  const remaining = Math.max(0, plot.growCompleteAt - Date.now());
  if (remaining === 0) {
    markPlotMature(plot);
    return;
  }

  const timerId = window.setTimeout(() => {
    growthTimers.delete(plot.id);
    markPlotMature(plot);
  }, remaining);
  growthTimers.set(plot.id, timerId);
  ensureGrowthTicker();
}

function hydratePlotGrowthTimers() {
  for (const plot of state.farm.plots) {
    if (plot.stage === FARM_STAGE_GROWING && Number.isFinite(plot.growCompleteAt)) {
      schedulePlotGrowth(plot);
    } else if (plot.stage === FARM_STAGE_GROWING) {
      plot.stage = FARM_STAGE_PLANTED;
      plot.growCompleteAt = null;
    }
  }

  ensureGrowthTicker();
}

function hasGrowingPlots() {
  return state.farm.plots.some((plot) => plot.stage === FARM_STAGE_GROWING && Number.isFinite(plot.growCompleteAt));
}

function ensureGrowthTicker() {
  if (growthTicker || !hasGrowingPlots()) {
    return;
  }

  growthTicker = window.setInterval(() => {
    if (!hasGrowingPlots()) {
      window.clearInterval(growthTicker);
      growthTicker = null;
      return;
    }

    notify();
  }, 250);
}

function saveFarmState() {
  saveFarmPlots(state.farm.plots);
}

export function setActiveTool(toolId) {
  state.ui.activeTool = toolId;
  state.inventory.selectedItemId = null;
  const toolMessages = {
    hand: "Hand tool selected.",
    water: "Water tool selected.",
    harvest: "Harvest tool selected.",
  };
  state.message = toolMessages[toolId] || "Tool selected.";
  notify();
}

export function clearActiveTool() {
  if (!state.ui.activeTool) {
    return false;
  }

  state.ui.activeTool = null;
  state.message = "Tool cleared.";
  notify();
  return true;
}

export function isToolActive(toolId) {
  return state.ui.activeTool === toolId;
}

export function selectInventoryItem(productId) {
  const product = getProduct(productId);
  if (!product) {
    return false;
  }

  state.inventory.selectedItemId = productId;
  state.ui.activeTool = null;
  state.message = `${product.inventoryName} selected.`;
  notify();
  return true;
}

export function clearInventorySelection() {
  if (!state.inventory.selectedItemId) {
    return false;
  }

  state.inventory.selectedItemId = null;
  notify();
  return true;
}

export function isInventoryItemSelected(productId) {
  return state.inventory.selectedItemId === productId;
}

export function getBarnItemQuantity(productId) {
  return state.barn.items[productId] || 0;
}

export function isBuildingBuilt(buildingId) {
  return Boolean(state.buildings[buildingId]);
}

export function addBarnItem(productId, quantity = 1) {
  if (quantity <= 0) {
    return false;
  }

  state.barn.items[productId] = (state.barn.items[productId] || 0) + quantity;
  notify();
  return true;
}

export function consumeBarnItem(productId, quantity = 1) {
  const currentQuantity = getBarnItemQuantity(productId);
  if (currentQuantity < quantity) {
    return false;
  }

  const nextQuantity = currentQuantity - quantity;
  if (nextQuantity > 0) {
    state.barn.items[productId] = nextQuantity;
  } else {
    delete state.barn.items[productId];
  }

  if (state.inventory.selectedItemId === productId && nextQuantity === 0) {
    state.inventory.selectedItemId = null;
  }

  notify();
  return true;
}

export function isProductSellable(productId) {
  const product = getProduct(productId);
  return Boolean(product && (product.category === "crops" || product.category === "processed"));
}

export function getSellItemQuantity(productId) {
  return state.sell.items[productId] || 0;
}

export function getSellEntries() {
  return Object.entries(state.sell.items)
    .map(([productId, quantity]) => {
      const product = getProduct(productId);
      return product && quantity > 0 ? { product, quantity } : null;
    })
    .filter(Boolean);
}

export function getSellTotal() {
  return getSellEntries().reduce((total, { product, quantity }) => {
    return total + getProductSellPrice(product.id) * quantity;
  }, 0);
}

export function addSellItem(productId, quantity = 1) {
  if (!isProductSellable(productId)) {
    state.message = "Only crops and products can be sold.";
    notify();
    return false;
  }

  const ownedQuantity = getBarnItemQuantity(productId);
  if (ownedQuantity <= 0) {
    state.message = "None available.";
    notify();
    return false;
  }

  const currentQuantity = getSellItemQuantity(productId);
  const nextQuantity = Math.min(ownedQuantity, currentQuantity + quantity);
  state.sell.items[productId] = nextQuantity;
  state.message = "Added to sell list.";
  notify();
  return true;
}

export function adjustSellItem(productId, delta) {
  const currentQuantity = getSellItemQuantity(productId);
  if (!currentQuantity) {
    return false;
  }

  const ownedQuantity = getBarnItemQuantity(productId);
  const nextQuantity = Math.max(0, Math.min(ownedQuantity, currentQuantity + delta));
  if (nextQuantity > 0) {
    state.sell.items[productId] = nextQuantity;
  } else {
    delete state.sell.items[productId];
  }
  notify();
  return true;
}

export function removeSellItem(productId) {
  if (!state.sell.items[productId]) {
    return false;
  }

  delete state.sell.items[productId];
  state.message = "Removed.";
  notify();
  return true;
}

export function sellQueuedItems() {
  const entries = getSellEntries();
  if (entries.length === 0) {
    state.message = "Nothing to sell.";
    notify();
    return false;
  }

  let total = 0;
  for (const { product, quantity } of entries) {
    const ownedQuantity = getBarnItemQuantity(product.id);
    const sellQuantity = Math.min(quantity, ownedQuantity);
    if (sellQuantity <= 0) {
      continue;
    }

    consumeBarnItem(product.id, sellQuantity);
    total += getProductSellPrice(product.id) * sellQuantity;
  }

  state.sell.items = {};
  state.coins += total;
  state.message = total > 0 ? `Sold for ${total} coins.` : "Nothing to sell.";
  notify();
  return total > 0;
}

export function canBuildMill() {
  return getBarnItemQuantity("wood") >= MILL_WOOD_COST && getBarnItemQuantity("nails") >= MILL_NAIL_COST;
}

export function buildMill() {
  if (state.buildings.mill) {
    state.message = "Mill already built.";
    notify();
    return false;
  }

  if (!canBuildMill()) {
    state.message = `Need ${MILL_WOOD_COST} wood and ${MILL_NAIL_COST} nails.`;
    notify();
    return false;
  }

  consumeBarnItem("wood", MILL_WOOD_COST);
  consumeBarnItem("nails", MILL_NAIL_COST);
  state.buildings.mill = true;
  saveFlag("millBuilt", true);
  state.message = "Mill built.";
  notify();
  return true;
}

export function millWheatToFlour() {
  if (!state.buildings.mill) {
    state.message = "Build a mill first.";
    notify();
    return false;
  }

  if (getBarnItemQuantity("wheatCrop") < 2) {
    state.message = "Need 2 wheat.";
    notify();
    return false;
  }

  consumeBarnItem("wheatCrop", 2);
  addBarnItem("flour", 1);
  state.message = "Flour made.";
  notify();
  return true;
}

export function plantSelectedSeedOnPlot(plotId) {
  return plantSeedOnPlot(plotId, state.inventory.selectedItemId);
}

export function plantSeedFromInventoryOnPlot(plotId, seedId) {
  return plantSeedOnPlot(plotId, seedId);
}

function plantSeedOnPlot(plotId, seedId) {
  const selectedProduct = seedId ? getProduct(seedId) : null;
  if (!seedId || !selectedProduct || selectedProduct.category !== "seeds") {
    state.message = "Select a seed first.";
    notify();
    return false;
  }

  const plot = getPlotById(plotId);
  if (!plot || plot.cropId) {
    state.message = "Plot is occupied.";
    notify();
    return false;
  }

  if (!consumeBarnItem(seedId, 1)) {
    state.message = `No ${selectedProduct.inventoryName} left.`;
    notify();
    return false;
  }

  plot.cropId = seedId;
  plot.stage = FARM_STAGE_PLANTED;
  plot.growCompleteAt = null;
  clearPlotGrowthTimer(plot.id);
  saveFarmState();
  state.message = `${selectedProduct.inventoryName} planted.`;
  notify();
  return true;
}

export function waterPlot(plotId) {
  const plot = getPlotById(plotId);
  if (!plot || !plot.cropId || plot.stage === FARM_STAGE_MATURE) {
    state.message = "Nothing to water.";
    notify();
    return false;
  }

  plot.stage = FARM_STAGE_GROWING;
  plot.growCompleteAt = Date.now() + FARM_GROWTH_DURATION_MS;
  saveFarmState();
  schedulePlotGrowth(plot);
  state.message = "Watered.";
  notify();
  return true;
}

export function harvestPlot(plotId) {
  const plot = getPlotById(plotId);
  if (!plot || plot.stage !== FARM_STAGE_MATURE || !plot.cropId) {
    state.message = "Not ready yet.";
    notify();
    return false;
  }

  const cropProduct = getProduct(plot.cropId);
  const harvestProductId = cropProduct?.cropProductId || plot.cropId;
  addBarnItem(harvestProductId, 1);
  addCoins(2);
  plot.cropId = null;
  plot.stage = FARM_STAGE_EMPTY;
  plot.growCompleteAt = null;
  clearPlotGrowthTimer(plot.id);
  saveFarmState();
  state.message = "Harvested.";
  notify();
  return true;
}

export function getNextLandPlotCost() {
  const ownedPlotCount = Math.max(0, state.farm.plots.length);
  if (ownedPlotCount === 0) {
    return 0;
  }

  return Math.ceil(FARM_PLOT_BASE_COST * Math.pow(FARM_PLOT_PRICE_GROWTH, ownedPlotCount - 1));
}

function clearFarmPlotAnimation(plotId) {
  const index = state.farm.enteringPlotIds.indexOf(plotId);
  if (index === -1) {
    return;
  }

  state.farm.enteringPlotIds.splice(index, 1);
  notify();
}

function markFarmPlotEntering(plotId) {
  if (!state.farm.enteringPlotIds.includes(plotId)) {
    state.farm.enteringPlotIds.push(plotId);
    notify();
  }

  window.setTimeout(() => clearFarmPlotAnimation(plotId), 500);
}

export function moveFarmPlot(plotId, left, top) {
  const plot = state.farm.plots.find((entry) => entry.id === plotId);
  if (!plot) {
    return false;
  }

  plot.left = left;
  plot.top = top;
  saveFarmPlots(state.farm.plots);
  notify();
  return true;
}

export function getPlotGrowthProgress(plot) {
  if (!plot || plot.stage !== FARM_STAGE_GROWING || !Number.isFinite(plot.growCompleteAt)) {
    return 0;
  }

  const remaining = Math.max(0, plot.growCompleteAt - Date.now());
  return Math.max(0, Math.min(100, Math.round((1 - remaining / FARM_GROWTH_DURATION_MS) * 100)));
}

export function spawnFarmPlot(preferredPosition = null) {
  const id = `farm-plot-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const plotPosition = createFarmPlotRecord(id, preferredPosition, state.farm.plots);
  const plot = {
    id,
    left: plotPosition.left,
    top: plotPosition.top,
    cropId: null,
    stage: FARM_STAGE_EMPTY,
    growCompleteAt: null,
  };
  state.farm.plots.push(plot);
  saveFarmState();
  markFarmPlotEntering(plot.id);
  return plot;
}

export function deleteCellByKey(key) {
  const farmPlotIndex = state.farm.plots.findIndex((plot) => plot.id === key);
  if (farmPlotIndex !== -1) {
    clearPlotGrowthTimer(key);
    state.farm.plots.splice(farmPlotIndex, 1);
    state.farm.enteringPlotIds = state.farm.enteringPlotIds.filter((plotId) => plotId !== key);
    saveFarmPlots(state.farm.plots);
    state.message = "Plot deleted.";
    notify();
    return true;
  }

  if (isCellHidden(key)) {
    return false;
  }

  if (key === "menu") {
    state.message = "Menu stays open.";
    notify();
    return false;
  }

  if (key === "mill") {
    state.buildings.mill = false;
    saveFlag("millBuilt", false);
    state.message = "Mill removed.";
    notify();
    return true;
  }

  state.ui.hiddenCellKeys.push(key);
  saveStringArray("hiddenCells", state.ui.hiddenCellKeys);
  state.message = "Cell deleted.";
  notify();
  return true;
}

export function restartFarm() {
  state.coins = STARTING_COINS;
  state.cells.farm = { left: 48, top: 48 };
  const starterLayout = getStarterLayoutPositions();
  state.cells.market = starterLayout.market;
  state.cells.money = starterLayout.money;
  state.cells.barn = starterLayout.barn;
  state.cells.menu = starterLayout.menu;
  state.cells.build = starterLayout.build;
  state.cells.mill = starterLayout.mill;
  state.cells.tools = starterLayout.tools;
  saveCellPosition("farm", state.cells.farm);
  saveCellPosition("market", state.cells.market);
  saveCellPosition("money", state.cells.money);
  saveCellPosition("barn", state.cells.barn);
  saveCellPosition("menu", state.cells.menu);
  saveCellPosition("build", state.cells.build);
  saveCellPosition("mill", state.cells.mill);
  saveCellPosition("tools", state.cells.tools);
  state.farm.plots = [];
  state.farm.enteringPlotIds = [];
  for (const timerId of growthTimers.values()) {
    window.clearTimeout(timerId);
  }
  growthTimers.clear();
  if (growthTicker) {
    window.clearInterval(growthTicker);
    growthTicker = null;
  }
  saveFarmPlots(state.farm.plots);
  state.barn.items = {};
  state.shopping.items = {};
  state.sell.items = {};
  state.buildings.mill = false;
  state.ui.hiddenCellKeys = [...DEFAULT_HIDDEN_CELL_KEYS];
  state.ui.activeTool = null;
  state.inventory.selectedItemId = null;
  saveStringArray("hiddenCells", state.ui.hiddenCellKeys);
  saveFlag("millBuilt", false);
  saveFlag("layoutInitialized", true);
  try {
    localStorage.setItem(STORAGE_KEYS.layoutVersion, LAYOUT_SAVE_VERSION);
  } catch {
    // Best effort.
  }
  state.message = "Farm restarted.";
  notify();
}

export function addShoppingItem(productId) {
  const product = getProduct(productId);
  if (!product) {
    return false;
  }

  state.shopping.items[productId] = (state.shopping.items[productId] || 0) + 1;
  state.message = `${product.marketName} added.`;
  notify();
  return true;
}

export function removeShoppingItem(productId) {
  if (!state.shopping.items[productId]) {
    return false;
  }

  const nextQuantity = state.shopping.items[productId] - 1;
  if (nextQuantity > 0) {
    state.shopping.items[productId] = nextQuantity;
  } else {
    delete state.shopping.items[productId];
  }

  state.message = nextQuantity > 0 ? "Quantity reduced." : "Removed.";
  notify();
  return true;
}

export function purchaseShoppingList() {
  const entries = Object.entries(state.shopping.items);
  if (entries.length === 0) {
    state.message = "List empty.";
    notify();
    return false;
  }

  let total = 0;
  for (const [productId, quantity] of entries) {
    const product = getProduct(productId);
    if (!product) {
      continue;
    }
    total += product.price * quantity;
  }

  if (state.coins < total) {
    state.message = `Need ${total} coins.`;
    notify();
    return false;
  }

  state.coins -= total;

  for (const [productId, quantity] of entries) {
    const product = getProduct(productId);
    if (!product) {
      continue;
    }

    addBarnItem(productId, quantity);
  }

  state.shopping.items = {};
  state.message = "Purchased.";
  notify();
  return true;
}

export function buyLandPlot() {
  const cost = getNextLandPlotCost();
  if (state.coins < cost) {
    state.message = `Need ${cost} coins.`;
    notify();
    return false;
  }

  state.coins -= cost;
  spawnFarmPlot();
  state.message = `Land plot bought for ${cost} coins.`;
  notify();
  return true;
}

export function getPlotDisplayLabel(plot) {
  if (!plot || !plot.cropId) {
    return "";
  }

  const cropProduct = getProduct(plot.cropId);
  return cropProduct?.marketName || cropProduct?.inventoryName || "";
}

export function getPlotStatusLabel(plot) {
  if (!plot || !plot.cropId) {
    return "";
  }

  if (plot.stage === FARM_STAGE_PLANTED) {
    return "need water";
  }

  if (plot.stage === FARM_STAGE_GROWING) {
    return "till growing";
  }

  if (plot.stage === FARM_STAGE_MATURE) {
    return "harvest";
  }

  return "";
}
