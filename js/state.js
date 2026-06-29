import { getProduct, getProductBuyPrice, getProductSellPrice } from "./catalog.js";
import { getCellSize } from "./layout.js";

const listeners = new Set();
const progressListeners = new Set();
const growthTimers = new Map();
let growthTicker = null;
let animalPenTicker = null;
let bakeryTicker = null;
const GRID_SIZE = 24;
const FARM_PLOT_SIZE = 72;
const FARM_PLOT_SPAWN_GAP = 0;
const STARTER_LAYOUT_MARGIN = 24;
const FARM_PLOT_BASE_COST = 10;
const FARM_PLOT_PRICE_GROWTH = 1.75;
const FARM_PLOT_STORAGE_KEY = "idle-farm-farm-plots-v2";
const FARM_PLOT_SAVE_VERSION = "5";
const FARM_STAGE_EMPTY = "empty";
const FARM_STAGE_PLANTED = "planted";
const FARM_STAGE_GROWING = "growing";
const FARM_STAGE_MATURE = "mature";
const FARM_PLOT_MIN_SPAN = 1;
const FARM_PLOT_MAX_SPAN = 3;
const FARM_PLOT_TILE_SEPARATOR = ":";
const FARM_PLOT_JOIN_TOLERANCE = 3;
export const LAYOUT_SAVE_VERSION = "12";
const STARTING_COINS = 5;
const DEFAULT_HIDDEN_CELL_KEYS = ["market", "sellMarket", "barn", "build", "fastItems"];
const LAYOUT_CELL_KEYS = [
  "farm",
  "market",
  "sellMarket",
  "shopping",
  "money",
  "barn",
  "fastItems",
  "menu",
  "build",
  "mill",
  "bakery",
  "animalFeeder",
  "animalPen",
  "chickenCoop",
  "tools",
];
const CELL_REVEAL_GAP = 20;
const MILL_WOOD_COST = 35;
const MILL_NAIL_COST = 0;
const BAKERY_WOOD_COST = 75;
const BAKERY_NAIL_COST = 25;
const ANIMAL_FEEDER_WOOD_COST = 125;
const ANIMAL_FEEDER_NAIL_COST = 25;
const ANIMAL_PEN_WOOD_COST = 55;
const ANIMAL_PEN_NAIL_COST = 0;
const CHICKEN_COOP_WOOD_COST = 25;
const CHICKEN_COOP_NAIL_COST = 0;
const BAKERY_STORAGE_KEY = "idle-farm-bakery-v1";
const BAKERY_SAVE_VERSION = "1";
const ANIMAL_PEN_STORAGE_KEY = "idle-farm-animal-pen-v1";
const CHICKEN_COOP_STORAGE_KEY = "idle-farm-chicken-coop-v1";
const ANIMAL_PEN_SAVE_VERSION = "1";
const ANIMAL_FEEDER_TARGETS = [
  { id: "cowPen", label: "Cow Pen", storageKey: "animalFeederCowPenEnabled" },
  { id: "chickenCoop", label: "Chicken Coop", storageKey: "animalFeederChickenCoopEnabled" },
  { id: "sheepFold", label: "SheepFold", storageKey: "animalFeederSheepFoldEnabled" },
  { id: "pigsty", label: "Pigsty", storageKey: "animalFeederPigstyEnabled" },
];

const STORAGE_KEYS = {
  farm: "idle-farm-farm-cell-position",
  market: "idle-farm-market-cell-position",
  sellMarket: "idle-farm-sell-market-cell-position",
  shopping: "idle-farm-shopping-cell-position",
  money: "idle-farm-money-cell-position",
  barn: "idle-farm-barn-cell-position",
  fastItems: "idle-farm-fast-items-cell-position",
  menu: "idle-farm-menu-cell-position",
  build: "idle-farm-build-cell-position",
  mill: "idle-farm-mill-cell-position",
  bakery: "idle-farm-bakery-cell-position",
  animalFeeder: "idle-farm-animal-feeder-cell-position",
  animalPen: "idle-farm-animal-pen-cell-position",
  chickenCoop: "idle-farm-chicken-coop-cell-position",
  millBuilt: "idle-farm-mill-built",
  bakeryBuilt: "idle-farm-bakery-built",
  animalFeederBuilt: "idle-farm-animal-feeder-built",
  animalFeederEnabled: "idle-farm-animal-feeder-enabled",
  animalFeederCowPenEnabled: "idle-farm-animal-feeder-cow-pen-enabled",
  animalFeederChickenCoopEnabled: "idle-farm-animal-feeder-chicken-coop-enabled",
  animalFeederSheepFoldEnabled: "idle-farm-animal-feeder-sheep-fold-enabled",
  animalFeederPigstyEnabled: "idle-farm-animal-feeder-pigsty-enabled",
  bakerySaveVersion: "idle-farm-bakery-version",
  animalPenBuilt: "idle-farm-animal-pen-built",
  chickenCoopBuilt: "idle-farm-chicken-coop-built",
  animalPenSaveVersion: "idle-farm-animal-pen-version",
  chickenCoopSaveVersion: "idle-farm-chicken-coop-version",
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
  sellMarket: readCellPosition("sellMarket", { left: 480, top: 48 }),
  shopping: readCellPosition("shopping", { left: 144, top: 204 }),
  money: readCellPosition("money", { left: 48, top: 16 }),
  barn: readCellPosition("barn", { left: 320, top: 48 }),
  fastItems: readCellPosition("fastItems", { left: 512, top: 48 }),
  menu: readCellPosition("menu", { left: 48, top: 240 }),
  build: readCellPosition("build", { left: 48, top: 328 }),
  mill: readCellPosition("mill", { left: 248, top: 328 }),
  bakery: readCellPosition("bakery", { left: 248, top: 488 }),
  animalFeeder: readCellPosition("animalFeeder", { left: 248, top: 656 }),
  animalPen: readCellPosition("animalPen", { left: 48, top: 420 }),
  chickenCoop: readCellPosition("chickenCoop", { left: 248, top: 420 }),
  tools: readCellPosition("tools", { left: 48, top: 240 }),
};

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function clampCellPositionToWorkspace(key, position) {
  const workspace = getWorkspaceSize();
  const bounds = getCellSize(key);
  return {
    left: Math.min(
      Math.max(0, workspace.width - bounds.width),
      Math.max(0, Number.isFinite(position?.left) ? position.left : 0)
    ),
    top: Math.min(
      Math.max(0, workspace.height - bounds.height),
      Math.max(0, Number.isFinite(position?.top) ? position.top : 0)
    ),
  };
}

function readCellPosition(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS[key]) || "{}");
    return clampCellPositionToWorkspace(key, {
      left: Number.isFinite(parsed.left) ? parsed.left : fallback.left,
      top: Number.isFinite(parsed.top) ? parsed.top : fallback.top,
    });
  } catch {
    return clampCellPositionToWorkspace(key, fallback);
  }
}

function saveCellPosition(key, position) {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(position));
  } catch {
    // Best effort.
  }
}

function hasStoredCellPosition(key) {
  try {
    return localStorage.getItem(STORAGE_KEYS[key]) !== null;
  } catch {
    return false;
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

function getAnimalFeederTargetOption(targetId) {
  return ANIMAL_FEEDER_TARGETS.find((target) => target.id === targetId) || null;
}

function createAnimalFeederTargets() {
  const legacyEnabled = readFlag("animalFeederEnabled", false);
  return Object.fromEntries(
    ANIMAL_FEEDER_TARGETS.map((target) => [
      target.id,
      readFlag(target.storageKey, target.id === "cowPen" ? legacyEnabled : false),
    ])
  );
}

function saveAnimalFeederTarget(targetId) {
  const target = getAnimalFeederTargetOption(targetId);
  if (!target) {
    return;
  }

  saveFlag(target.storageKey, Boolean(state.animalFeeder.targets[targetId]));
}

function saveAnimalFeederTargets() {
  for (const target of ANIMAL_FEEDER_TARGETS) {
    saveAnimalFeederTarget(target.id);
  }
  saveFlag("animalFeederEnabled", hasAnyAnimalFeederTargetEnabled());
}

function resetAnimalFeederTargets() {
  state.animalFeeder.targets = Object.fromEntries(ANIMAL_FEEDER_TARGETS.map((target) => [target.id, false]));
  state.animalFeeder.enabled = false;
  saveAnimalFeederTargets();
}

function hasAnyAnimalFeederTargetEnabled() {
  return ANIMAL_FEEDER_TARGETS.some((target) => Boolean(state.animalFeeder.targets?.[target.id]));
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

function clampPositionToWorkspace(position, size, margin = STARTER_LAYOUT_MARGIN) {
  const workspace = getWorkspaceSize();
  return {
    left: Math.min(
      Math.max(margin, workspace.width - size.width - margin),
      Math.max(margin, position.left)
    ),
    top: Math.min(
      Math.max(margin, workspace.height - size.height - margin),
      Math.max(margin, position.top)
    ),
  };
}

function getCenteredStarterFarmPosition() {
  const workspace = getWorkspaceSize();
  const farmSize = { width: FARM_PLOT_SIZE, height: FARM_PLOT_SIZE };
  return clampPositionToWorkspace({
    left: Math.round((workspace.width - farmSize.width) / 2),
    top: Math.round((workspace.height - farmSize.height) / 2),
  }, farmSize);
}

function normalizeFarmPlotSpan(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return FARM_PLOT_MIN_SPAN;
  }

  return Math.max(FARM_PLOT_MIN_SPAN, Math.min(FARM_PLOT_MAX_SPAN, Math.round(numericValue)));
}

export function getFarmPlotSize(plot = {}) {
  const columns = normalizeFarmPlotSpan(plot.columns);
  const rows = normalizeFarmPlotSpan(plot.rows);
  return {
    columns,
    rows,
    width: FARM_PLOT_SIZE * columns,
    height: FARM_PLOT_SIZE * rows,
    area: columns * rows,
  };
}

function createEmptyFarmPlotTile() {
  return {
    cropId: null,
    stage: FARM_STAGE_EMPTY,
    growCompleteAt: null,
  };
}

function normalizeFarmPlotTile(tile = {}) {
  const stage = tile.stage === FARM_STAGE_PLANTED || tile.stage === FARM_STAGE_GROWING || tile.stage === FARM_STAGE_MATURE
    ? tile.stage
    : FARM_STAGE_EMPTY;

  return {
    cropId: typeof tile.cropId === "string" ? tile.cropId : null,
    stage,
    growCompleteAt: Number.isFinite(tile.growCompleteAt) ? tile.growCompleteAt : null,
  };
}

function normalizeFarmPlotTiles(plot, columns, rows) {
  const tileCount = columns * rows;
  const tiles = Array.from({ length: tileCount }, () => createEmptyFarmPlotTile());

  if (Array.isArray(plot?.tiles)) {
    for (let index = 0; index < Math.min(plot.tiles.length, tileCount); index += 1) {
      tiles[index] = normalizeFarmPlotTile(plot.tiles[index]);
    }
    return tiles;
  }

  if (typeof plot?.cropId === "string") {
    tiles[0] = normalizeFarmPlotTile({
      cropId: plot.cropId,
      stage: plot.stage,
      growCompleteAt: plot.growCompleteAt,
    });
  }

  return tiles;
}

export function getFarmPlotTileId(plotId, tileIndex = 0) {
  return `${plotId}${FARM_PLOT_TILE_SEPARATOR}${Math.max(0, Number(tileIndex) || 0)}`;
}

function parseFarmPlotTileId(tileId) {
  if (typeof tileId !== "string") {
    return { plotId: "", tileIndex: 0 };
  }

  const separatorIndex = tileId.lastIndexOf(FARM_PLOT_TILE_SEPARATOR);
  if (separatorIndex === -1) {
    return { plotId: tileId, tileIndex: 0 };
  }

  const plotId = tileId.slice(0, separatorIndex);
  const tileIndex = Number(tileId.slice(separatorIndex + 1));
  return {
    plotId,
    tileIndex: Number.isInteger(tileIndex) && tileIndex >= 0 ? tileIndex : 0,
  };
}

function getTopRightSellMarketPosition() {
  const workspace = getWorkspaceSize();
  const marketSize = getCellSize("sellMarket");
  return clampPositionToWorkspace({
    left: workspace.width - marketSize.width - STARTER_LAYOUT_MARGIN,
    top: STARTER_LAYOUT_MARGIN,
  }, marketSize);
}

function createStarterFarmPlots(preferredPosition = getCenteredStarterFarmPosition()) {
  const position = clampFarmPlotToWorkspace(preferredPosition);
  return [{
    id: "farm-plot-0",
    left: position.left,
    top: position.top,
    columns: 1,
    rows: 1,
    tiles: [createEmptyFarmPlotTile()],
    cropId: null,
    stage: FARM_STAGE_EMPTY,
    growCompleteAt: null,
  }];
}

function readStoredFarmPlots() {
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
    // Fall back to a starter plot.
  }

  const plots = createStarterFarmPlots();
  saveFarmPlots(plots);
  return plots;
}

function readFarmPlots() {
  return readStoredFarmPlots();
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

function normalizeAnimalPenFood(food) {
  const normalized = {};
  if (!food || typeof food !== "object") {
    return normalized;
  }

  for (const [productId, quantity] of Object.entries(food)) {
    if (typeof productId !== "string" || !productId) {
      continue;
    }

    const nextQuantity = Number(quantity);
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      continue;
    }

    normalized[productId] = nextQuantity;
  }

  return normalized;
}

function normalizeAnimalPenAnimal(animal, index) {
  if (!animal || typeof animal !== "object") {
    return null;
  }

  const product = typeof animal.productId === "string" ? getProduct(animal.productId) : null;
  if (!product || product.category !== "animals") {
    return null;
  }

  const readyAt = Number.isFinite(animal.readyAt) ? animal.readyAt : null;
  return {
    id: typeof animal.id === "string" && animal.id ? animal.id : `${product.id}-${Date.now()}-${index}`,
    productId: product.id,
    readyAt,
  };
}

function normalizeAnimalPenState(pen) {
  const source = pen && typeof pen === "object" ? pen : {};
  const animals = Array.isArray(source.animals)
    ? source.animals
        .map((animal, index) => normalizeAnimalPenAnimal(animal, index))
        .filter(Boolean)
    : [];

  return {
    food: normalizeAnimalPenFood(source.food),
    animals,
  };
}

function saveAnimalPenState(pen = state.animalPen) {
  try {
    localStorage.setItem(ANIMAL_PEN_STORAGE_KEY, JSON.stringify(pen));
    localStorage.setItem(STORAGE_KEYS.animalPenSaveVersion, ANIMAL_PEN_SAVE_VERSION);
  } catch {
    // Best effort.
  }
}

function saveChickenCoopState(pen = state.chickenCoop) {
  try {
    localStorage.setItem(CHICKEN_COOP_STORAGE_KEY, JSON.stringify(pen));
    localStorage.setItem(STORAGE_KEYS.chickenCoopSaveVersion, ANIMAL_PEN_SAVE_VERSION);
  } catch {
    // Best effort.
  }
}

function readAnimalPenState() {
  const storedVersion = localStorage.getItem(STORAGE_KEYS.animalPenSaveVersion);
  const emptyPen = { food: {}, animals: [] };

  if (storedVersion !== ANIMAL_PEN_SAVE_VERSION) {
    saveAnimalPenState(emptyPen);
    return emptyPen;
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(ANIMAL_PEN_STORAGE_KEY) || "null");
    const pen = normalizeAnimalPenState(parsed);
    saveAnimalPenState(pen);
    return pen;
  } catch {
    saveAnimalPenState(emptyPen);
    return emptyPen;
  }
}

function readChickenCoopState() {
  const storedVersion = localStorage.getItem(STORAGE_KEYS.chickenCoopSaveVersion);
  const emptyPen = { food: {}, animals: [] };

  if (storedVersion !== ANIMAL_PEN_SAVE_VERSION) {
    saveChickenCoopState(emptyPen);
    return emptyPen;
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(CHICKEN_COOP_STORAGE_KEY) || "null");
    const pen = normalizeAnimalPenState(parsed);
    saveChickenCoopState(pen);
    return pen;
  } catch {
    saveChickenCoopState(emptyPen);
    return emptyPen;
  }
}

function normalizeBakeryOrder(order, index) {
  if (!order || typeof order !== "object") {
    return null;
  }

  const product = getProduct(typeof order.productId === "string" ? order.productId : "");
  if (!product || typeof product.bakeDurationMs !== "number" || !product.bakeIngredients) {
    return null;
  }

  const readyAt = Number.isFinite(order.readyAt) ? order.readyAt : null;
  return {
    id: typeof order.id === "string" && order.id ? order.id : `${product.id}-${Date.now()}-${index}`,
    productId: product.id,
    readyAt,
  };
}

function normalizeBakeryState(bakery) {
  const source = bakery && typeof bakery === "object" ? bakery : {};
  const queue = Array.isArray(source.queue)
    ? source.queue
        .map((order, index) => normalizeBakeryOrder(order, index))
        .filter(Boolean)
    : [];

  return {
    queue,
  };
}

function saveBakeryState(bakery = state.bakery) {
  try {
    localStorage.setItem(BAKERY_STORAGE_KEY, JSON.stringify(bakery));
    localStorage.setItem(STORAGE_KEYS.bakerySaveVersion, BAKERY_SAVE_VERSION);
  } catch {
    // Best effort.
  }
}

function readBakeryState() {
  const storedVersion = localStorage.getItem(STORAGE_KEYS.bakerySaveVersion);
  const emptyBakery = { queue: [] };

  if (storedVersion !== BAKERY_SAVE_VERSION) {
    saveBakeryState(emptyBakery);
    return emptyBakery;
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(BAKERY_STORAGE_KEY) || "null");
    const bakery = normalizeBakeryState(parsed);
    saveBakeryState(bakery);
    return bakery;
  } catch {
    saveBakeryState(emptyBakery);
    return emptyBakery;
  }
}

function getWorkspaceSize() {
  const workspace = document.getElementById("workspace");
  return {
    width: workspace?.clientWidth || window.innerWidth || 1024,
    height: workspace?.clientHeight || window.innerHeight || 768,
  };
}

export function getStarterLayoutPositions() {
  const workspace = getWorkspaceSize();
  const gap = 16;
  const barnSize = getCellSize("barn");
  const marketSize = getCellSize("market");
  const moneySize = getCellSize("money");
  const menuSize = getCellSize("menu");
  const buildSize = getCellSize("build");
  const millSize = getCellSize("mill");
  const bakerySize = getCellSize("bakery");
  const animalFeederSize = getCellSize("animalFeeder");
  const animalPenSize = getCellSize("animalPen");
  const chickenCoopSize = getCellSize("chickenCoop");
  const menuLeft = Math.max(16, Math.round((workspace.width - menuSize.width) / 2));
  const toolsLeft = menuLeft;
  const menuTop = Math.max(16, Math.round((workspace.height - menuSize.height) / 2));
  const toolsTop = menuTop + menuSize.height + gap;
  const popupTop = Math.max(16, menuTop - Math.max(marketSize.height, barnSize.height) - gap);
  const popupBottomTop = Math.min(workspace.height - moneySize.height - 16, menuTop + menuSize.height + gap);
  const rightColumnWidth = Math.max(buildSize.width, millSize.width, bakerySize.width, animalFeederSize.width, animalPenSize.width, chickenCoopSize.width);
  const popupRightLeft = Math.min(
    Math.max(16, menuLeft),
    Math.max(16, workspace.width - Math.max(rightColumnWidth, moneySize.width) - 16)
  );
  const buildTop = popupTop;
  const millTop = Math.min(workspace.height - millSize.height - 16, buildTop + buildSize.height + gap);
  const bakeryTop = Math.min(workspace.height - bakerySize.height - 16, millTop + millSize.height + gap);
  const animalFeederTop = Math.min(workspace.height - animalFeederSize.height - 16, bakeryTop + bakerySize.height + gap);
  const animalPenTop = Math.min(workspace.height - animalPenSize.height - 16, animalFeederTop + animalFeederSize.height + gap);
  const chickenCoopTop = Math.min(workspace.height - chickenCoopSize.height - 16, animalPenTop + animalPenSize.height + gap);

  return {
    barn: { left: menuLeft, top: popupBottomTop },
    market: { left: menuLeft, top: popupTop },
    sellMarket: getTopRightSellMarketPosition(),
    shopping: { left: menuLeft, top: popupTop },
    money: getPinnedMoneyPosition(),
    fastItems: { left: popupRightLeft, top: menuTop },
    menu: { left: menuLeft, top: menuTop },
    build: { left: popupRightLeft, top: buildTop },
    mill: { left: popupRightLeft, top: millTop },
    bakery: { left: popupRightLeft, top: bakeryTop },
    animalFeeder: { left: popupRightLeft, top: animalFeederTop },
    animalPen: { left: popupRightLeft, top: animalPenTop },
    chickenCoop: { left: popupRightLeft, top: chickenCoopTop },
    tools: { left: toolsLeft, top: toolsTop },
  };
}

export function getPinnedMoneyPosition() {
  const workspace = getWorkspaceSize();
  const moneySize = getCellSize("money");
  return {
    left: Math.max(0, Math.round((workspace.width - moneySize.width) / 2)),
    top: 16,
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
      left: DEFAULT_CELL_POSITIONS.market.left,
      top: DEFAULT_CELL_POSITIONS.market.top,
      width: getCellSize("market").width,
      height: getCellSize("market").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.sellMarket.left,
      top: DEFAULT_CELL_POSITIONS.sellMarket.top,
      width: getCellSize("sellMarket").width,
      height: getCellSize("sellMarket").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.shopping.left,
      top: DEFAULT_CELL_POSITIONS.shopping.top,
      width: getCellSize("shopping").width,
      height: getCellSize("shopping").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.money.left,
      top: DEFAULT_CELL_POSITIONS.money.top,
      width: getCellSize("money").width,
      height: getCellSize("money").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.barn.left,
      top: DEFAULT_CELL_POSITIONS.barn.top,
      width: getCellSize("barn").width,
      height: getCellSize("barn").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.fastItems.left,
      top: DEFAULT_CELL_POSITIONS.fastItems.top,
      width: getCellSize("fastItems").width,
      height: getCellSize("fastItems").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.build.left,
      top: DEFAULT_CELL_POSITIONS.build.top,
      width: getCellSize("build").width,
      height: getCellSize("build").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.mill.left,
      top: DEFAULT_CELL_POSITIONS.mill.top,
      width: getCellSize("mill").width,
      height: getCellSize("mill").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.bakery.left,
      top: DEFAULT_CELL_POSITIONS.bakery.top,
      width: getCellSize("bakery").width,
      height: getCellSize("bakery").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.animalFeeder.left,
      top: DEFAULT_CELL_POSITIONS.animalFeeder.top,
      width: getCellSize("animalFeeder").width,
      height: getCellSize("animalFeeder").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.animalPen.left,
      top: DEFAULT_CELL_POSITIONS.animalPen.top,
      width: getCellSize("animalPen").width,
      height: getCellSize("animalPen").height,
    },
    {
      left: DEFAULT_CELL_POSITIONS.chickenCoop.left,
      top: DEFAULT_CELL_POSITIONS.chickenCoop.top,
      width: getCellSize("chickenCoop").width,
      height: getCellSize("chickenCoop").height,
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

function isCellRectFree(left, top, width, height, obstacles, gap = 8) {
  return obstacles.every((rect) => !rectsOverlapWithGap(left, top, width, height, rect, gap));
}

function isFarmPlotPositionFree(candidate, plots, excludePlotId = null) {
  const candidateSize = getFarmPlotSize(candidate);
  const obstacles = getObstacleRects(excludePlotId).concat(
    plots
      .filter((plot) => plot.id !== excludePlotId)
      .map((plot) => ({
        left: plot.left,
        top: plot.top,
        width: getFarmPlotSize(plot).width,
        height: getFarmPlotSize(plot).height,
      }))
  );

  return obstacles.every(
    (rect) => !rectsOverlapWithGap(
      candidate.left,
      candidate.top,
      candidateSize.width,
      candidateSize.height,
      rect,
      FARM_PLOT_SPAWN_GAP
    )
  );
}

function isFarmPlotPositionFreeFromPlots(candidate, plots, excludePlotId = null) {
  const candidateSize = getFarmPlotSize(candidate);
  return plots
    .filter((plot) => plot.id !== excludePlotId)
    .every((plot) => !rectsOverlapWithGap(
      candidate.left,
      candidate.top,
      candidateSize.width,
      candidateSize.height,
      {
        left: plot.left,
        top: plot.top,
        width: getFarmPlotSize(plot).width,
        height: getFarmPlotSize(plot).height,
      },
      FARM_PLOT_SPAWN_GAP
    ));
}

function clampFarmPlotToWorkspace(position) {
  const workspace = getWorkspaceSize();
  const size = getFarmPlotSize(position);
  const maxLeft = Math.max(0, workspace.width - size.width);
  const maxTop = Math.max(0, workspace.height - size.height);

  return {
    left: snapToGrid(Math.min(maxLeft, Math.max(0, position.left))),
    top: snapToGrid(Math.min(maxTop, Math.max(0, position.top))),
  };
}

function createFarmPlotRecord(id, preferredPosition, existingPlots) {
  const workspace = getWorkspaceSize();
  const dimensions = getFarmPlotSize(preferredPosition);
  const fallbackPosition = getCenteredStarterFarmPosition();
  const basePosition = {
    left: Number.isFinite(preferredPosition?.left) ? preferredPosition.left : fallbackPosition.left,
    top: Number.isFinite(preferredPosition?.top) ? preferredPosition.top : fallbackPosition.top,
  };
  const maxLeft = Math.max(0, workspace.width - dimensions.width);
  const maxTop = Math.max(0, workspace.height - dimensions.height);
  const searchOrigin = clampFarmPlotToWorkspace({
    ...basePosition,
    columns: dimensions.columns,
    rows: dimensions.rows,
  });
  const visitedPositions = new Set();

  function getAvailableCandidate(position) {
    const candidate = clampFarmPlotToWorkspace({ ...position, columns: dimensions.columns, rows: dimensions.rows });
    const key = `${candidate.left}:${candidate.top}`;
    if (visitedPositions.has(key)) {
      return null;
    }

    visitedPositions.add(key);
    return isFarmPlotPositionFree({ ...candidate, columns: dimensions.columns, rows: dimensions.rows }, existingPlots, id) ? candidate : null;
  }

  const originCandidate = getAvailableCandidate(searchOrigin);
  if (originCandidate) {
    return {
      id,
      left: originCandidate.left,
      top: originCandidate.top,
    };
  }

  const maxSearchRadius = Math.max(maxLeft, maxTop) + Math.max(dimensions.width, dimensions.height);
  for (let radius = GRID_SIZE; radius <= maxSearchRadius; radius += GRID_SIZE) {
    for (let offset = -radius; offset <= radius; offset += GRID_SIZE) {
      const topCandidate = getAvailableCandidate({
        left: searchOrigin.left + offset,
        top: searchOrigin.top - radius,
      });
      if (topCandidate) {
        return {
          id,
          left: topCandidate.left,
          top: topCandidate.top,
        };
      }

      const bottomCandidate = getAvailableCandidate({
        left: searchOrigin.left + offset,
        top: searchOrigin.top + radius,
      });
      if (bottomCandidate) {
        return {
          id,
          left: bottomCandidate.left,
          top: bottomCandidate.top,
        };
      }
    }

    for (let offset = -radius + GRID_SIZE; offset <= radius - GRID_SIZE; offset += GRID_SIZE) {
      const leftCandidate = getAvailableCandidate({
        left: searchOrigin.left - radius,
        top: searchOrigin.top + offset,
      });
      if (leftCandidate) {
        return {
          id,
          left: leftCandidate.left,
          top: leftCandidate.top,
        };
      }

      const rightCandidate = getAvailableCandidate({
        left: searchOrigin.left + radius,
        top: searchOrigin.top + offset,
      });
      if (rightCandidate) {
        return {
          id,
          left: rightCandidate.left,
          top: rightCandidate.top,
        };
      }
    }
  }

  const gridColumns = Math.max(1, Math.floor(maxLeft / GRID_SIZE));
  const gridRows = Math.max(1, Math.floor(maxTop / GRID_SIZE));
  for (let row = 0; row <= gridRows; row += 1) {
    for (let column = 0; column <= gridColumns; column += 1) {
      const candidate = getAvailableCandidate({
        left: column * GRID_SIZE,
        top: row * GRID_SIZE,
      });
      if (candidate) {
        return {
          id,
          left: candidate.left,
          top: candidate.top,
        };
      }
    }
  }

  return {
    id,
    left: searchOrigin.left,
    top: searchOrigin.top,
  };
}

function normalizeFarmPlot(plot, index, existingPlots = []) {
  if (!plot) {
    return null;
  }

  const id = typeof plot.id === "string" && plot.id ? plot.id : `farm-plot-${index}`;
  const columns = normalizeFarmPlotSpan(plot.columns);
  const rows = normalizeFarmPlotSpan(plot.rows);
  const preferredPosition = {
    left: Number.isFinite(plot.left) ? plot.left : DEFAULT_CELL_POSITIONS.farm.left + index * GRID_SIZE,
    top: Number.isFinite(plot.top) ? plot.top : DEFAULT_CELL_POSITIONS.farm.top + index * GRID_SIZE,
    columns,
    rows,
  };
  const clampedPosition = clampFarmPlotToWorkspace(preferredPosition);
  const position = isFarmPlotPositionFreeFromPlots({ ...clampedPosition, columns, rows }, existingPlots, id)
    ? { id, ...clampedPosition }
    : createFarmPlotRecord(id, { ...clampedPosition, columns, rows }, existingPlots);
  const stage = plot.stage === FARM_STAGE_PLANTED || plot.stage === FARM_STAGE_GROWING || plot.stage === FARM_STAGE_MATURE
    ? plot.stage
    : FARM_STAGE_EMPTY;
  return {
    id,
    left: position.left,
    top: position.top,
    columns,
    rows,
    tiles: normalizeFarmPlotTiles({ ...plot, stage }, columns, rows),
    cropId: null,
    stage: FARM_STAGE_EMPTY,
    growCompleteAt: null,
  };
}

export const state = {
  coins: STARTING_COINS,
  cells: {
    farm: DEFAULT_CELL_POSITIONS.farm,
    market: DEFAULT_CELL_POSITIONS.market,
    sellMarket: DEFAULT_CELL_POSITIONS.sellMarket,
    shopping: DEFAULT_CELL_POSITIONS.shopping,
    money: DEFAULT_CELL_POSITIONS.money,
    barn: DEFAULT_CELL_POSITIONS.barn,
    fastItems: DEFAULT_CELL_POSITIONS.fastItems,
    menu: DEFAULT_CELL_POSITIONS.menu,
    build: DEFAULT_CELL_POSITIONS.build,
    mill: DEFAULT_CELL_POSITIONS.mill,
    bakery: DEFAULT_CELL_POSITIONS.bakery,
    animalFeeder: DEFAULT_CELL_POSITIONS.animalFeeder,
    animalPen: DEFAULT_CELL_POSITIONS.animalPen,
    chickenCoop: DEFAULT_CELL_POSITIONS.chickenCoop,
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
  bakery: readBakeryState(),
  animalPen: readAnimalPenState(),
  chickenCoop: readChickenCoopState(),
  buildings: {
    mill: readFlag("millBuilt", false),
    bakery: readFlag("bakeryBuilt", false),
    animalFeeder: readFlag("animalFeederBuilt", false),
    animalPen: readFlag("animalPenBuilt", false),
    chickenCoop: readFlag("chickenCoopBuilt", false),
  },
  animalFeeder: {
    enabled: readFlag("animalFeederEnabled", false),
    targets: createAnimalFeederTargets(),
  },
  message: "Drag the cell.",
};

hydratePlotGrowthTimers();
hydrateBakeryState();
hydrateAnimalPenState();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function notifyProgress() {
  for (const listener of progressListeners) {
    listener();
  }
}

export function onStateChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function onProgressChange(listener) {
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
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

  const spawnPosition = hasStoredCellPosition(key)
    ? clampCellPositionToWorkspace(key, state.cells[key])
    : getCenteredSpawnPosition(key);
  state.cells[key].left = spawnPosition.left;
  state.cells[key].top = spawnPosition.top;
  saveCellPosition(key, state.cells[key]);
  state.ui.hiddenCellKeys.splice(index, 1);
  saveStringArray("hiddenCells", state.ui.hiddenCellKeys);
  notify();
  return true;
}

function getCenteredSpawnPosition(key) {
  const workspace = getWorkspaceSize();
  const bounds = getCellSize(key);
  const obstacles = getObstacleRects(key);
  const maxLeft = Math.max(0, workspace.width - bounds.width);
  const maxTop = Math.max(0, workspace.height - bounds.height);
  const baseLeft = snapToGrid(Math.min(maxLeft, Math.max(0, Math.round((workspace.width - bounds.width) / 2))));
  const baseTop = snapToGrid(Math.min(maxTop, Math.max(0, Math.round((workspace.height - bounds.height) / 2))));
  const searchStep = GRID_SIZE;
  const maxRadius = Math.max(
    1,
    Math.ceil(
      Math.max(
        workspace.width / searchStep,
        workspace.height / searchStep
      )
    )
  );

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        if (Math.max(Math.abs(offsetX), Math.abs(offsetY)) !== radius) {
          continue;
        }

        const left = Math.min(maxLeft, Math.max(0, baseLeft + offsetX * searchStep));
        const top = Math.min(maxTop, Math.max(0, baseTop + offsetY * searchStep));
        if (isCellRectFree(left, top, bounds.width, bounds.height, obstacles, CELL_REVEAL_GAP)) {
          return { left, top };
        }
      }
    }
  }

  for (let top = 0; top <= maxTop; top += searchStep) {
    for (let left = 0; left <= maxLeft; left += searchStep) {
      const snappedLeft = snapToGrid(left);
      const snappedTop = snapToGrid(top);
      if (isCellRectFree(snappedLeft, snappedTop, bounds.width, bounds.height, obstacles, CELL_REVEAL_GAP)) {
        return {
          left: snappedLeft,
          top: snappedTop,
        };
      }
    }
  }

  return { left: baseLeft, top: baseTop };
}

export function moveCell(key, left, top) {
  const position = clampCellPositionToWorkspace(key, { left, top });
  state.cells[key].left = position.left;
  state.cells[key].top = position.top;
  saveCellPosition(key, state.cells[key]);
  notify();
}

export function stabilizeLayoutPositions({ shouldNotify = true } = {}) {
  let didChange = false;

  for (const key of LAYOUT_CELL_KEYS) {
    const currentPosition = state.cells[key];
    if (!currentPosition) {
      continue;
    }

    const nextPosition = clampCellPositionToWorkspace(key, currentPosition);
    if (nextPosition.left !== currentPosition.left || nextPosition.top !== currentPosition.top) {
      state.cells[key] = nextPosition;
      saveCellPosition(key, nextPosition);
      didChange = true;
    }
  }

  for (const plot of state.farm.plots) {
    const nextPosition = clampFarmPlotToWorkspace(plot);
    if (nextPosition.left !== plot.left || nextPosition.top !== plot.top) {
      plot.left = nextPosition.left;
      plot.top = nextPosition.top;
      didChange = true;
    }
  }

  if (didChange) {
    saveFarmPlots(state.farm.plots);
    if (shouldNotify) {
      notify();
    }
  }

  return didChange;
}

export function applyStarterLayout(force = false) {
  const storedLayoutVersion = localStorage.getItem(STORAGE_KEYS.layoutVersion);
  if (!force && storedLayoutVersion === LAYOUT_SAVE_VERSION) {
    return false;
  }

  const layout = getStarterLayoutPositions();
  state.cells.market = layout.market;
  state.cells.sellMarket = layout.sellMarket;
  state.cells.shopping = layout.shopping;
  state.cells.money = layout.money;
  state.cells.barn = layout.barn;
  state.cells.fastItems = layout.fastItems;
  state.cells.menu = layout.menu;
  state.cells.build = layout.build;
  state.cells.mill = layout.mill;
  state.cells.bakery = layout.bakery;
  state.cells.animalFeeder = layout.animalFeeder;
  state.cells.animalPen = layout.animalPen;
  state.cells.chickenCoop = layout.chickenCoop;
  state.cells.tools = layout.tools;
  saveCellPosition("market", state.cells.market);
  saveCellPosition("sellMarket", state.cells.sellMarket);
  saveCellPosition("shopping", state.cells.shopping);
  saveCellPosition("money", state.cells.money);
  saveCellPosition("barn", state.cells.barn);
  saveCellPosition("fastItems", state.cells.fastItems);
  saveCellPosition("menu", state.cells.menu);
  saveCellPosition("build", state.cells.build);
  saveCellPosition("mill", state.cells.mill);
  saveCellPosition("bakery", state.cells.bakery);
  saveCellPosition("animalFeeder", state.cells.animalFeeder);
  saveCellPosition("animalPen", state.cells.animalPen);
  saveCellPosition("chickenCoop", state.cells.chickenCoop);
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

export function getFarmPlotTileById(tileId) {
  const { plotId, tileIndex } = parseFarmPlotTileId(tileId);
  const plot = getPlotById(plotId);
  if (!plot) {
    return null;
  }

  const plotSize = getFarmPlotSize(plot);
  if (!Array.isArray(plot.tiles) || plot.tiles.length !== plotSize.area) {
    plot.tiles = normalizeFarmPlotTiles(plot, plotSize.columns, plotSize.rows);
  }

  const tile = plot.tiles[tileIndex];
  if (!tile) {
    return null;
  }

  return {
    plot,
    tile,
    tileIndex,
    tileId: getFarmPlotTileId(plot.id, tileIndex),
  };
}

function getPlotTiles(plot) {
  const plotSize = getFarmPlotSize(plot);
  if (!Array.isArray(plot.tiles) || plot.tiles.length !== plotSize.area) {
    plot.tiles = normalizeFarmPlotTiles(plot, plotSize.columns, plotSize.rows);
  }
  return plot.tiles;
}

function clearPlotGrowthTimer(tileId) {
  const timerId = growthTimers.get(tileId);
  if (timerId) {
    window.clearTimeout(timerId);
    growthTimers.delete(tileId);
  }
}

function markPlotMature(tile, tileId) {
  if (!tile) {
    return false;
  }

  clearPlotGrowthTimer(tileId);
  tile.stage = FARM_STAGE_MATURE;
  tile.growCompleteAt = null;
  saveFarmPlots(state.farm.plots);
  if (!hasGrowingPlots() && growthTicker) {
    window.clearInterval(growthTicker);
    growthTicker = null;
  }
  notify();
  return true;
}

function schedulePlotGrowth(tile, tileId) {
  if (!tile || tile.stage !== FARM_STAGE_GROWING || !Number.isFinite(tile.growCompleteAt)) {
    return;
  }

  clearPlotGrowthTimer(tileId);
  const remaining = Math.max(0, tile.growCompleteAt - Date.now());
  if (remaining === 0) {
    markPlotMature(tile, tileId);
    return;
  }

  const timerId = window.setTimeout(() => {
    growthTimers.delete(tileId);
    markPlotMature(tile, tileId);
  }, remaining);
  growthTimers.set(tileId, timerId);
  ensureGrowthTicker();
}

function hydratePlotGrowthTimers() {
  for (const plot of state.farm.plots) {
    const tiles = getPlotTiles(plot);
    for (let index = 0; index < tiles.length; index += 1) {
      const tile = tiles[index];
      const tileId = getFarmPlotTileId(plot.id, index);
      if (tile.stage === FARM_STAGE_GROWING && Number.isFinite(tile.growCompleteAt)) {
        schedulePlotGrowth(tile, tileId);
      } else if (tile.stage === FARM_STAGE_GROWING) {
        tile.stage = FARM_STAGE_PLANTED;
        tile.growCompleteAt = null;
      }
    }
  }

  ensureGrowthTicker();
}

function hasGrowingPlots() {
  return state.farm.plots.some((plot) => getPlotTiles(plot).some((tile) => tile.stage === FARM_STAGE_GROWING && Number.isFinite(tile.growCompleteAt)));
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

    if (document.body.classList.contains("is-dragging-cell")) {
      return;
    }

    notifyProgress();
  }, 250);
}

function saveFarmState() {
  saveFarmPlots(state.farm.plots);
}

function getPlantedCropProduct(plot) {
  if (!plot?.cropId) {
    return null;
  }

  const plantedProduct = getProduct(plot.cropId);
  if (!plantedProduct) {
    return null;
  }

  if (plantedProduct.category === "crops") {
    return plantedProduct;
  }

  if (plantedProduct.category === "seeds" && plantedProduct.cropProductId) {
    return getProduct(plantedProduct.cropProductId);
  }

  return plantedProduct;
}

function getPlotGrowthDurationMs(plot) {
  const cropProduct = getPlantedCropProduct(plot);
  if (!cropProduct) {
    return 0;
  }

  return Number.isFinite(cropProduct?.growDurationMs) ? cropProduct.growDurationMs : 0;
}

function getAnimalProduct(productId) {
  const product = getProduct(productId);
  return product?.category === "animals" ? product : null;
}

function getAnimalOutputProduct(productId) {
  const product = getAnimalProduct(productId);
  if (!product || typeof product.outputProductId !== "string") {
    return null;
  }

  return getProduct(product.outputProductId);
}

function getAnimalFoodRequirement(productId) {
  const product = getAnimalOutputProduct(productId);
  return product?.foodCost && typeof product.foodCost === "object" ? product.foodCost : {};
}

function getAnimalPenTargets() {
  return [
    {
      id: "cowPen",
      buildingId: "animalPen",
      label: "Cow Pen",
      pen: state.animalPen,
      save: saveAnimalPenState,
    },
    {
      id: "chickenCoop",
      buildingId: "chickenCoop",
      label: "Chicken Coop",
      pen: state.chickenCoop,
      save: saveChickenCoopState,
    },
  ];
}

function getNeededPenFood(pen) {
  const neededFood = {};
  if (!pen || !Array.isArray(pen.animals)) {
    return neededFood;
  }

  for (const animal of pen.animals) {
    if (Number.isFinite(animal.readyAt)) {
      continue;
    }

    for (const [productId, quantity] of Object.entries(getAnimalFoodRequirement(animal.productId))) {
      neededFood[productId] = (neededFood[productId] || 0) + quantity;
    }
  }

  return neededFood;
}

function getAnimalProductionDurationMs(productId) {
  const product = getAnimalOutputProduct(productId);
  return Number.isFinite(product?.productionDurationMs) ? product.productionDurationMs : 0;
}

function getAnimalProductionQuantity(product) {
  const min = Number.isFinite(product?.productionYieldMin) ? product.productionYieldMin : 1;
  const max = Number.isFinite(product?.productionYieldMax) ? product.productionYieldMax : min;
  if (max <= min) {
    return Math.max(1, Math.floor(min));
  }

  return Math.floor(min + Math.random() * (max - min + 1));
}

function getAnimalOutputProductId(productId) {
  const product = getAnimalProduct(productId);
  return typeof product?.outputProductId === "string" && product.outputProductId ? product.outputProductId : null;
}

function grantBarnItemSilently(productId, quantity = 1) {
  if (quantity <= 0) {
    return false;
  }

  state.barn.items[productId] = (state.barn.items[productId] || 0) + quantity;
  return true;
}

function consumeBarnItemSilently(productId, quantity = 1) {
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

  return true;
}

function autoFeedAnimalPens({ shouldAdvance = true, shouldNotify = false } = {}) {
  if (!state.buildings.animalFeeder || !hasAnyAnimalFeederTargetEnabled()) {
    return false;
  }

  let changed = false;
  for (const target of getAnimalPenTargets()) {
    if (!state.animalFeeder.targets[target.id]) {
      continue;
    }

    if (!state.buildings[target.buildingId]) {
      continue;
    }

    const neededFood = getNeededPenFood(target.pen);
    let penChanged = false;

    for (const [productId, quantity] of Object.entries(neededFood)) {
      const storedQuantity = target.pen.food[productId] || 0;
      const missingQuantity = Math.max(0, quantity - storedQuantity);
      const transferQuantity = Math.min(missingQuantity, getBarnItemQuantity(productId));
      if (transferQuantity <= 0) {
        continue;
      }

      consumeBarnItemSilently(productId, transferQuantity);
      target.pen.food[productId] = storedQuantity + transferQuantity;
      penChanged = true;
      changed = true;
    }

    if (penChanged) {
      target.save(target.pen);
    }
  }

  if (changed && shouldAdvance) {
    advanceAnimalPenProduction({ shouldNotify: false, shouldAutoFeed: false });
  }

  if (changed && shouldNotify) {
    state.message = "Animals fed.";
    notify();
  }

  return changed;
}

function getAnimalPenFoodQuantity(pen, productId) {
  return pen?.food?.[productId] || 0;
}

function hasAnimalPenFood(pen, requirement) {
  return Object.entries(requirement).every(([productId, quantity]) => getAnimalPenFoodQuantity(pen, productId) >= quantity);
}

function consumeAnimalPenFood(pen, requirement) {
  for (const [productId, quantity] of Object.entries(requirement)) {
    const currentQuantity = getAnimalPenFoodQuantity(pen, productId);
    const nextQuantity = Math.max(0, currentQuantity - quantity);
    if (nextQuantity > 0) {
      pen.food[productId] = nextQuantity;
    } else {
      delete pen.food[productId];
    }
  }
}

function topUpChickenCoopFood(pen, requirement) {
  if (!state.buildings.chickenCoop || !pen) {
    return false;
  }

  let changed = false;
  for (const [productId, quantity] of Object.entries(requirement)) {
    const storedQuantity = getAnimalPenFoodQuantity(pen, productId);
    const missingQuantity = Math.max(0, quantity - storedQuantity);
    const transferQuantity = Math.min(missingQuantity, getBarnItemQuantity(productId));
    if (transferQuantity <= 0) {
      continue;
    }

    consumeBarnItemSilently(productId, transferQuantity);
    pen.food[productId] = storedQuantity + transferQuantity;
    changed = true;
  }

  return changed;
}

function hasActiveAnimalPenCycles() {
  return getAnimalPenTargets().some((target) =>
    state.buildings[target.buildingId] && target.pen.animals.some((animal) => Number.isFinite(animal.readyAt))
  );
}

function clearAnimalPenTicker() {
  if (!animalPenTicker) {
    return;
  }

  window.clearInterval(animalPenTicker);
  animalPenTicker = null;
}

function ensureAnimalPenTicker() {
  if (animalPenTicker || !hasActiveAnimalPenCycles()) {
    return;
  }

  animalPenTicker = window.setInterval(() => {
    if (!hasActiveAnimalPenCycles()) {
      clearAnimalPenTicker();
      return;
    }

    if (document.body.classList.contains("is-dragging-cell")) {
      return;
    }

    const changed = advanceAnimalPenProduction();
    if (!changed && hasActiveAnimalPenCycles()) {
      notifyProgress();
    }
  }, 250);
}

function getBakeryProduct(productId) {
  const product = getProduct(productId);
  if (!product || product.category !== "processed" || !product.bakeIngredients) {
    return null;
  }

  return product;
}

function getBakeryIngredients(productId) {
  const product = getBakeryProduct(productId);
  return product && typeof product.bakeIngredients === "object" ? product.bakeIngredients : {};
}

function getBakeryBakeDurationMs(productId) {
  const product = getBakeryProduct(productId);
  return Number.isFinite(product?.bakeDurationMs) ? product.bakeDurationMs : 0;
}

function getBakeryOrderProgress(order) {
  if (!order || !Number.isFinite(order.readyAt)) {
    return 0;
  }

  const duration = getBakeryBakeDurationMs(order.productId);
  if (duration <= 0) {
    return 100;
  }

  const remaining = Math.max(0, order.readyAt - Date.now());
  return Math.max(0, Math.min(100, Math.round((1 - remaining / duration) * 100)));
}

function hasActiveBakeryOrders() {
  return state.bakery.queue.some((order) => Number.isFinite(order.readyAt));
}

function clearBakeryTicker() {
  if (!bakeryTicker) {
    return;
  }

  window.clearInterval(bakeryTicker);
  bakeryTicker = null;
}

function ensureBakeryTicker() {
  if (bakeryTicker || !hasActiveBakeryOrders()) {
    return;
  }

  bakeryTicker = window.setInterval(() => {
    if (!hasActiveBakeryOrders()) {
      clearBakeryTicker();
      return;
    }

    if (document.body.classList.contains("is-dragging-cell")) {
      return;
    }

    const changed = advanceBakeryProduction();
    if (!changed && hasActiveBakeryOrders()) {
      notifyProgress();
    }
  }, 250);
}

function consumeBakeryIngredients(ingredients) {
  for (const [productId, quantity] of Object.entries(ingredients)) {
    consumeBarnItemSilently(productId, quantity);
  }
}

function hasBakeryIngredients(ingredients) {
  return Object.entries(ingredients).every(([productId, quantity]) => getBarnItemQuantity(productId) >= quantity);
}

function getIngredientRequirementText(ingredients) {
  return Object.entries(ingredients)
    .map(([productId, quantity]) => `${getProduct(productId)?.marketName || "Item"} x${quantity}`)
    .join(", ");
}

function getMillProduct(productId) {
  const product = getProduct(productId);
  if (!product || product.category !== "processed" || !product.millIngredients) {
    return null;
  }

  return product;
}

function getMillIngredients(productId) {
  const product = getMillProduct(productId);
  return product && typeof product.millIngredients === "object" ? product.millIngredients : {};
}

function queueBakeryOrder(productId) {
  const product = getBakeryProduct(productId);
  if (!product) {
    state.message = "That recipe is not available.";
    notify();
    return false;
  }

  if (!state.buildings.bakery) {
    state.message = "Build a bakery first.";
    notify();
    return false;
  }

  const ingredients = getBakeryIngredients(product.id);
  if (!hasBakeryIngredients(ingredients)) {
    state.message = `Need ${getIngredientRequirementText(ingredients)}.`;
    notify();
    return false;
  }

  const duration = getBakeryBakeDurationMs(product.id);
  const lastOrder = state.bakery.queue[state.bakery.queue.length - 1];
  const baseReadyAt = Number.isFinite(lastOrder?.readyAt) ? Math.max(lastOrder.readyAt, Date.now()) : Date.now();

  consumeBakeryIngredients(ingredients);
  state.bakery.queue.push({
    id: `${product.id}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
    productId: product.id,
    readyAt: baseReadyAt + duration,
  });
  saveBakeryState(state.bakery);
  ensureBakeryTicker();
  state.message = `${product.inventoryName} queued.`;
  notify();
  return true;
}

function advanceBakeryProduction({ shouldNotify = true } = {}) {
  if (!state.buildings.bakery) {
    clearBakeryTicker();
    return false;
  }

  let changed = false;
  let bakedProductName = "";
  const now = Date.now();

  while (state.bakery.queue.length > 0) {
    const order = state.bakery.queue[0];
    if (!Number.isFinite(order.readyAt) || order.readyAt > now) {
      break;
    }

    state.bakery.queue.shift();
    grantBarnItemSilently(order.productId, 1);
    bakedProductName = getProduct(order.productId)?.inventoryName || "Product";
    changed = true;
  }

  if (changed) {
    saveBakeryState(state.bakery);
    if (hasActiveBakeryOrders()) {
      ensureBakeryTicker();
    } else {
      clearBakeryTicker();
    }
    if (bakedProductName) {
      state.message = `${bakedProductName} baked.`;
    }
    if (shouldNotify) {
      notify();
    }
    return true;
  }

  if (!hasActiveBakeryOrders()) {
    clearBakeryTicker();
  }

  return false;
}

function advanceAnimalPenProduction({ shouldNotify = true, shouldAutoFeed = true } = {}) {
  let changed = false;
  let producedProductName = "";
  const now = Date.now();

  for (const target of getAnimalPenTargets()) {
    if (!state.buildings[target.buildingId]) {
      continue;
    }

    let targetChanged = false;

    for (const animal of target.pen.animals) {
      if (Number.isFinite(animal.readyAt) && animal.readyAt <= now) {
        animal.readyAt = null;
        const outputProductId = getAnimalOutputProductId(animal.productId);
        const outputProduct = outputProductId ? getProduct(outputProductId) : null;
        if (outputProduct) {
          grantBarnItemSilently(outputProduct.id, getAnimalProductionQuantity(outputProduct));
          producedProductName = outputProduct.inventoryName;
          targetChanged = true;
          changed = true;
        }
      }
    }
    if (targetChanged) {
      target.save(target.pen);
    }
  }

  if (shouldAutoFeed) {
    changed = autoFeedAnimalPens({ shouldAdvance: false }) || changed;
  }

  for (const target of getAnimalPenTargets()) {
    if (!state.buildings[target.buildingId]) {
      continue;
    }

    let targetChanged = false;
    for (const animal of target.pen.animals) {
      if (Number.isFinite(animal.readyAt)) {
        continue;
      }

      const requirement = getAnimalFoodRequirement(animal.productId);
      if (!hasAnimalPenFood(target.pen, requirement)) {
        continue;
      }

      consumeAnimalPenFood(target.pen, requirement);
      animal.readyAt = Date.now() + getAnimalProductionDurationMs(animal.productId);
      targetChanged = true;
      changed = true;
    }

    if (targetChanged) {
      target.save(target.pen);
    }
  }

  if (changed) {
    ensureAnimalPenTicker();
    if (producedProductName) {
      state.message = `${producedProductName} produced.`;
    }
    if (shouldNotify) {
      notify();
    }
    return true;
  }

  if (!hasActiveAnimalPenCycles()) {
    clearAnimalPenTicker();
  }

  return false;
}

function hydrateAnimalPenState() {
  if (!state.animalPen || typeof state.animalPen !== "object") {
    state.animalPen = { food: {}, animals: [] };
  }

  state.animalPen.food = normalizeAnimalPenFood(state.animalPen.food);
  state.animalPen.animals = Array.isArray(state.animalPen.animals)
    ? state.animalPen.animals.filter((animal) => animal && typeof animal === "object")
    : [];

  if (!state.chickenCoop || typeof state.chickenCoop !== "object") {
    state.chickenCoop = { food: {}, animals: [] };
  }

  state.chickenCoop.food = normalizeAnimalPenFood(state.chickenCoop.food);
  state.chickenCoop.animals = Array.isArray(state.chickenCoop.animals)
    ? state.chickenCoop.animals.filter((animal) => animal && typeof animal === "object")
    : [];

  advanceAnimalPenProduction({ shouldNotify: false });
}

function hydrateBakeryState() {
  if (!state.bakery || typeof state.bakery !== "object") {
    state.bakery = { queue: [] };
  }

  state.bakery.queue = Array.isArray(state.bakery.queue)
    ? state.bakery.queue
        .map((order, index) => normalizeBakeryOrder(order, index))
        .filter(Boolean)
    : [];

  advanceBakeryProduction({ shouldNotify: false });
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

export function canBuildAnimalPen() {
  return getBarnItemQuantity("wood") >= ANIMAL_PEN_WOOD_COST && getBarnItemQuantity("nails") >= ANIMAL_PEN_NAIL_COST;
}

export function canBuildChickenCoop() {
  return getBarnItemQuantity("wood") >= CHICKEN_COOP_WOOD_COST && getBarnItemQuantity("nails") >= CHICKEN_COOP_NAIL_COST;
}

export function canBuildAnimalFeeder() {
  return getBarnItemQuantity("wood") >= ANIMAL_FEEDER_WOOD_COST && getBarnItemQuantity("nails") >= ANIMAL_FEEDER_NAIL_COST;
}

export function buildAnimalFeeder() {
  if (state.buildings.animalFeeder) {
    state.message = "Animal feeder already built.";
    notify();
    return false;
  }

  if (!canBuildAnimalFeeder()) {
    state.message = `Need ${ANIMAL_FEEDER_WOOD_COST} wood and ${ANIMAL_FEEDER_NAIL_COST} nails.`;
    notify();
    return false;
  }

  consumeBarnItemSilently("wood", ANIMAL_FEEDER_WOOD_COST);
  consumeBarnItemSilently("nails", ANIMAL_FEEDER_NAIL_COST);
  state.buildings.animalFeeder = true;
  saveFlag("animalFeederBuilt", true);
  resetAnimalFeederTargets();
  state.message = "Animal feeder built.";
  notify();
  return true;
}

export function isAnimalFeederEnabled() {
  return Boolean(state.buildings.animalFeeder && hasAnyAnimalFeederTargetEnabled());
}

export function getAnimalFeederSlots() {
  return ANIMAL_FEEDER_TARGETS.map((target) => ({
    id: target.id,
    label: target.label,
    enabled: Boolean(state.animalFeeder.targets[target.id]),
    status: getAnimalFeederTargetStatusText(target.id),
  }));
}

export function toggleAnimalFeederTarget(targetId) {
  if (!state.buildings.animalFeeder) {
    state.message = "Build an animal feeder first.";
    notify();
    return false;
  }

  const target = getAnimalFeederTargetOption(targetId);
  if (!target) {
    return false;
  }

  state.animalFeeder.targets[targetId] = !state.animalFeeder.targets[targetId];
  state.animalFeeder.enabled = hasAnyAnimalFeederTargetEnabled();
  saveAnimalFeederTarget(targetId);
  saveFlag("animalFeederEnabled", state.animalFeeder.enabled);
  if (state.animalFeeder.targets[targetId]) {
    autoFeedAnimalPens({ shouldNotify: false });
  }
  state.message = state.animalFeeder.targets[targetId]
    ? `${target.label} feeder enabled.`
    : `${target.label} feeder disabled.`;
  notify();
  return true;
}

export function getAnimalFeederStatusText() {
  if (!state.buildings.animalFeeder) {
    return "Not built";
  }

  if (!hasAnyAnimalFeederTargetEnabled()) {
    return "Disabled";
  }

  const hasAnyPen = getAnimalPenTargets().some((target) => state.buildings[target.buildingId]);
  if (!hasAnyPen) {
    return "No pens";
  }

  const foodIds = new Set();
  for (const target of getAnimalPenTargets()) {
    if (!state.animalFeeder.targets[target.id]) {
      continue;
    }

    if (!state.buildings[target.buildingId]) {
      continue;
    }
    for (const productId of Object.keys(getNeededPenFood(target.pen))) {
      foodIds.add(productId);
    }
  }

  if (foodIds.size === 0) {
    return "Ready";
  }

  const hasFood = Array.from(foodIds).some((productId) => getBarnItemQuantity(productId) > 0);
  return hasFood ? "Feeding" : "No food";
}

function getAnimalFeederTargetStatusText(targetId) {
  if (!state.buildings.animalFeeder) {
    return "Not built";
  }

  if (!state.animalFeeder.targets[targetId]) {
    return "Disabled";
  }

  const target = getAnimalPenTargets().find((entry) => entry.id === targetId);
  if (!target) {
    return "Future";
  }

  if (!state.buildings[target.buildingId]) {
    return "No pen";
  }

  const foodIds = Object.keys(getNeededPenFood(target.pen));
  if (foodIds.length === 0) {
    return "Ready";
  }

  const hasFood = foodIds.some((productId) => getBarnItemQuantity(productId) > 0);
  return hasFood ? "Feeding" : "No food";
}

export function buildAnimalPen() {
  if (state.buildings.animalPen) {
    state.message = "Cow pen already built.";
    notify();
    return false;
  }

  if (!canBuildAnimalPen()) {
    state.message = `Need ${ANIMAL_PEN_WOOD_COST} wood.`;
    notify();
    return false;
  }

  consumeBarnItemSilently("wood", ANIMAL_PEN_WOOD_COST);
  consumeBarnItemSilently("nails", ANIMAL_PEN_NAIL_COST);
  state.buildings.animalPen = true;
  saveFlag("animalPenBuilt", true);
  state.message = "Cow pen built.";
  autoFeedAnimalPens({ shouldAdvance: false });
  advanceAnimalPenProduction({ shouldNotify: false });
  notify();
  return true;
}

export function buildChickenCoop() {
  if (state.buildings.chickenCoop) {
    state.message = "Chicken coop already built.";
    notify();
    return false;
  }

  if (!canBuildChickenCoop()) {
    state.message = `Need ${CHICKEN_COOP_WOOD_COST} wood.`;
    notify();
    return false;
  }

  consumeBarnItemSilently("wood", CHICKEN_COOP_WOOD_COST);
  consumeBarnItemSilently("nails", CHICKEN_COOP_NAIL_COST);
  state.buildings.chickenCoop = true;
  saveFlag("chickenCoopBuilt", true);
  state.message = "Chicken coop built.";
  autoFeedAnimalPens({ shouldAdvance: false });
  advanceAnimalPenProduction({ shouldNotify: false });
  notify();
  return true;
}

export function addAnimalToPen(productId) {
  const product = getAnimalProduct(productId);
  if (!product) {
    state.message = "That animal cannot go there.";
    notify();
    return false;
  }

  const target = getAnimalPenTargets().find((entry) => entry.buildingId === (product.penBuildingId || "animalPen"));
  if (!target) {
    state.message = "That animal cannot go there.";
    notify();
    return false;
  }

  if (!state.buildings[target.buildingId]) {
    state.message = `Build a ${target.label.toLowerCase()} first.`;
    notify();
    return false;
  }

  if (!consumeBarnItemSilently(productId, 1)) {
    state.message = `No ${product.inventoryName} left.`;
    notify();
    return false;
  }

  target.pen.animals.push({
    id: `${product.id}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
    productId: product.id,
    readyAt: null,
  });
  target.save(target.pen);
  autoFeedAnimalPens({ shouldAdvance: false });
  advanceAnimalPenProduction({ shouldNotify: false });
  state.message = `${product.inventoryName} moved to the ${target.label.toLowerCase()}.`;
  notify();
  return true;
}

export function addAnimalFoodToPen(productId, quantity = 1) {
  const product = getProduct(productId);
  if (!product || product.id !== "strawCrop") {
    state.message = "Only straw goes here.";
    notify();
    return false;
  }

  if (!state.buildings.animalPen) {
    state.message = "Build an animal pen first.";
    notify();
    return false;
  }

  if (!consumeBarnItemSilently(productId, quantity)) {
    state.message = `No ${product.inventoryName} left.`;
    notify();
    return false;
  }

  state.animalPen.food[productId] = (state.animalPen.food[productId] || 0) + quantity;
  saveAnimalPenState(state.animalPen);
  advanceAnimalPenProduction({ shouldNotify: false });
  state.message = "Food added.";
  notify();
  return true;
}

export function addChickenFoodToCoop(productId, quantity = 1) {
  const product = getProduct(productId);
  if (!product || product.id !== "cornCrop") {
    state.message = "Only corn goes here.";
    notify();
    return false;
  }

  if (!state.buildings.chickenCoop) {
    state.message = "Build a chicken coop first.";
    notify();
    return false;
  }

  if (!consumeBarnItemSilently(productId, quantity)) {
    state.message = `No ${product.inventoryName} left.`;
    notify();
    return false;
  }

  state.chickenCoop.food[productId] = (state.chickenCoop.food[productId] || 0) + quantity;
  saveChickenCoopState(state.chickenCoop);
  advanceAnimalPenProduction({ shouldNotify: false });
  state.message = "Chicken food added.";
  notify();
  return true;
}

export function removeChickenFoodFromCoop(productId, quantity = 1) {
  const product = getProduct(productId);
  if (!product || product.id !== "cornCrop") {
    state.message = "Only corn goes here.";
    notify();
    return false;
  }

  if (!state.buildings.chickenCoop) {
    state.message = "Build a chicken coop first.";
    notify();
    return false;
  }

  const currentQuantity = state.chickenCoop.food[productId] || 0;
  if (currentQuantity < quantity) {
    state.message = "No chicken food to remove.";
    notify();
    return false;
  }

  const nextQuantity = currentQuantity - quantity;
  if (nextQuantity > 0) {
    state.chickenCoop.food[productId] = nextQuantity;
  } else {
    delete state.chickenCoop.food[productId];
  }

  grantBarnItemSilently(productId, quantity);
  saveChickenCoopState(state.chickenCoop);
  advanceAnimalPenProduction({ shouldNotify: false, shouldAutoFeed: false });
  state.message = "Chicken food removed.";
  notify();
  return true;
}

export function canBuildBakery() {
  return getBarnItemQuantity("wood") >= BAKERY_WOOD_COST && getBarnItemQuantity("nails") >= BAKERY_NAIL_COST;
}

export function buildBakery() {
  if (state.buildings.bakery) {
    state.message = "Bakery already built.";
    notify();
    return false;
  }

  if (!canBuildBakery()) {
    state.message = `Need ${BAKERY_WOOD_COST} wood and ${BAKERY_NAIL_COST} nails.`;
    notify();
    return false;
  }

  consumeBarnItemSilently("wood", BAKERY_WOOD_COST);
  consumeBarnItemSilently("nails", BAKERY_NAIL_COST);
  state.buildings.bakery = true;
  saveFlag("bakeryBuilt", true);
  state.message = "Bakery built.";
  advanceBakeryProduction({ shouldNotify: false });
  notify();
  return true;
}

export function addBarnItem(productId, quantity = 1) {
  if (quantity <= 0) {
    return false;
  }

  state.barn.items[productId] = (state.barn.items[productId] || 0) + quantity;
  autoFeedAnimalPens({ shouldNotify: false });
  notify();
  return true;
}

export function consumeBarnItem(productId, quantity = 1) {
  if (!consumeBarnItemSilently(productId, quantity)) {
    return false;
  }

  notify();
  return true;
}

export function isProductSellable(productId) {
  const product = getProduct(productId);
  return Boolean(product && getProductSellPrice(product.id) > 0);
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

export function getShoppingListTotal() {
  return Object.entries(state.shopping.items).reduce((total, [productId, quantity]) => {
    const product = getProduct(productId);
    if (!product) {
      return total;
    }

    return total + getProductBuyPrice(product) * Math.max(0, Number(quantity) || 0);
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
  const availableQuantity = currentQuantity + ownedQuantity;
  const nextQuantity = Math.min(availableQuantity, currentQuantity + quantity);
  const addedQuantity = nextQuantity - currentQuantity;
  if (addedQuantity <= 0) {
    state.message = "None available.";
    notify();
    return false;
  }

  if (!consumeBarnItemSilently(productId, addedQuantity)) {
    state.message = "None available.";
    notify();
    return false;
  }

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
  const availableQuantity = currentQuantity + ownedQuantity;
  const nextQuantity = Math.max(0, Math.min(availableQuantity, currentQuantity + delta));
  const change = nextQuantity - currentQuantity;
  if (change > 0) {
    if (!consumeBarnItemSilently(productId, change)) {
      return false;
    }
  } else if (change < 0) {
    grantBarnItemSilently(productId, Math.abs(change));
    autoFeedAnimalPens({ shouldNotify: false });
  }

  if (nextQuantity > 0) {
    state.sell.items[productId] = nextQuantity;
  } else {
    delete state.sell.items[productId];
  }
  notify();
  return true;
}

export function removeSellItem(productId) {
  const quantity = state.sell.items[productId];
  if (!quantity) {
    return false;
  }

  grantBarnItemSilently(productId, quantity);
  autoFeedAnimalPens({ shouldNotify: false });
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
    total += getProductSellPrice(product.id) * quantity;
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
    state.message = `Need ${MILL_WOOD_COST} wood.`;
    notify();
    return false;
  }

  consumeBarnItemSilently("wood", MILL_WOOD_COST);
  consumeBarnItemSilently("nails", MILL_NAIL_COST);
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

  const product = getMillProduct("flour");
  const ingredients = getMillIngredients("flour");

  if (!product) {
    state.message = "That recipe is not available.";
    notify();
    return false;
  }

  if (!hasBakeryIngredients(ingredients)) {
    state.message = `Need ${getIngredientRequirementText(ingredients)}.`;
    notify();
    return false;
  }

  consumeBakeryIngredients(ingredients);
  grantBarnItemSilently(product.id, 1);
  state.message = `${product.inventoryName} made.`;
  notify();
  return true;
}

export function canBakeBread() {
  return Boolean(state.buildings.bakery) && hasBakeryIngredients(getBakeryIngredients("bread"));
}

export function bakeBread() {
  return queueBakeryOrder("bread");
}

export function plantSelectedSeedOnPlot(plotId) {
  return plantSeedOnPlot(plotId, state.inventory.selectedItemId);
}

export function plantSeedFromInventoryOnPlot(plotTileId, seedId) {
  return plantSeedOnPlot(plotTileId, seedId);
}

function plantSeedOnPlot(plotTileId, seedId) {
  const selectedProduct = seedId ? getProduct(seedId) : null;
  if (!seedId || !selectedProduct || selectedProduct.category !== "seeds") {
    state.message = "Select a seed first.";
    notify();
    return false;
  }

  const tileRecord = getFarmPlotTileById(plotTileId);
  if (!tileRecord || tileRecord.tile.cropId) {
    state.message = "Plot is occupied.";
    notify();
    return false;
  }

  if (!consumeBarnItemSilently(seedId, 1)) {
    state.message = `No ${selectedProduct.inventoryName} left.`;
    notify();
    return false;
  }

  tileRecord.tile.cropId = seedId;
  tileRecord.tile.stage = FARM_STAGE_PLANTED;
  tileRecord.tile.growCompleteAt = null;
  clearPlotGrowthTimer(tileRecord.tileId);
  saveFarmState();
  state.message = `${selectedProduct.inventoryName} planted.`;
  notify();
  return true;
}

export function waterPlot(plotTileId) {
  const tileRecord = getFarmPlotTileById(plotTileId);
  if (!tileRecord || !tileRecord.tile.cropId || tileRecord.tile.stage === FARM_STAGE_MATURE) {
    state.message = "Nothing to water.";
    notify();
    return false;
  }

  tileRecord.tile.stage = FARM_STAGE_GROWING;
  tileRecord.tile.growCompleteAt = Date.now() + getPlotGrowthDurationMs(tileRecord.tile);
  saveFarmState();
  schedulePlotGrowth(tileRecord.tile, tileRecord.tileId);
  state.message = "Watered.";
  notify();
  return true;
}

export function harvestPlot(plotTileId) {
  const tileRecord = getFarmPlotTileById(plotTileId);
  if (!tileRecord || !tileRecord.tile.cropId) {
    state.message = "Not ready yet.";
    notify();
    return false;
  }

  const tile = tileRecord.tile;

  if (tile.stage === FARM_STAGE_PLANTED || tile.stage === FARM_STAGE_GROWING) {
    grantBarnItemSilently(tile.cropId, 1);
    tile.cropId = null;
    tile.stage = FARM_STAGE_EMPTY;
    tile.growCompleteAt = null;
    clearPlotGrowthTimer(tileRecord.tileId);
    saveFarmState();
    state.message = "Seed recovered.";
    notify();
    return true;
  }

  if (tile.stage !== FARM_STAGE_MATURE) {
    state.message = "Not ready yet.";
    notify();
    return false;
  }

  const plantedProduct = getProduct(tile.cropId);
  const harvestProductId = plantedProduct?.cropProductId || tile.cropId;
  const cropProduct = getProduct(harvestProductId);
  const harvestQuantity = Number.isFinite(cropProduct?.harvestYield) ? cropProduct.harvestYield : 1;
  grantBarnItemSilently(harvestProductId, harvestQuantity);
  if (cropProduct?.harvestDrops && typeof cropProduct.harvestDrops === "object") {
    for (const [productId, quantity] of Object.entries(cropProduct.harvestDrops)) {
      grantBarnItemSilently(productId, quantity);
    }
  }
  autoFeedAnimalPens({ shouldNotify: false });
  tile.cropId = null;
  tile.stage = FARM_STAGE_EMPTY;
  tile.growCompleteAt = null;
  clearPlotGrowthTimer(tileRecord.tileId);
  saveFarmState();
  state.message = "Harvested.";
  notify();
  return true;
}

export function getNextLandPlotCost() {
  return getFarmPlotCost();
}

export function getFarmPlotCost(plot = {}) {
  const ownedPlotCount = Math.max(0, state.farm.plots.length);
  const area = getFarmPlotSize(plot).area;
  if (ownedPlotCount === 0) {
    return 0;
  }

  return Math.ceil(FARM_PLOT_BASE_COST * area * Math.pow(FARM_PLOT_PRICE_GROWTH, ownedPlotCount - 1));
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

function valuesNearlyEqual(first, second, tolerance = FARM_PLOT_JOIN_TOLERANCE) {
  return Math.abs(first - second) <= tolerance;
}

function getFarmPlotRect(plot) {
  const size = getFarmPlotSize(plot);
  return {
    left: plot.left,
    top: plot.top,
    right: plot.left + size.width,
    bottom: plot.top + size.height,
    columns: size.columns,
    rows: size.rows,
    area: size.area,
  };
}

function getJoinCandidateRect(firstPlot, secondPlot) {
  const first = getFarmPlotRect(firstPlot);
  const second = getFarmPlotRect(secondPlot);
  const left = Math.min(first.left, second.left);
  const top = Math.min(first.top, second.top);
  const right = Math.max(first.right, second.right);
  const bottom = Math.max(first.bottom, second.bottom);
  const rawColumns = (right - left) / FARM_PLOT_SIZE;
  const rawRows = (bottom - top) / FARM_PLOT_SIZE;
  const columns = Math.round(rawColumns);
  const rows = Math.round(rawRows);

  if (
    columns < FARM_PLOT_MIN_SPAN ||
    rows < FARM_PLOT_MIN_SPAN ||
    columns > FARM_PLOT_MAX_SPAN ||
    rows > FARM_PLOT_MAX_SPAN ||
    !valuesNearlyEqual(rawColumns * FARM_PLOT_SIZE, columns * FARM_PLOT_SIZE) ||
    !valuesNearlyEqual(rawRows * FARM_PLOT_SIZE, rows * FARM_PLOT_SIZE)
  ) {
    return null;
  }

  const unionArea = columns * rows;
  const sourceArea = first.area + second.area;
  if (unionArea !== sourceArea) {
    return null;
  }

  return { left, top, columns, rows, area: unionArea };
}

function copyFarmPlotTilesInto(targetTiles, sourcePlot, targetRect) {
  const sourceSize = getFarmPlotSize(sourcePlot);
  const sourceTiles = getPlotTiles(sourcePlot);
  const columnOffset = Math.round((sourcePlot.left - targetRect.left) / FARM_PLOT_SIZE);
  const rowOffset = Math.round((sourcePlot.top - targetRect.top) / FARM_PLOT_SIZE);

  for (let row = 0; row < sourceSize.rows; row += 1) {
    for (let column = 0; column < sourceSize.columns; column += 1) {
      const sourceIndex = row * sourceSize.columns + column;
      const targetIndex = (rowOffset + row) * targetRect.columns + columnOffset + column;
      if (targetTiles[targetIndex]) {
        targetTiles[targetIndex] = normalizeFarmPlotTile(sourceTiles[sourceIndex]);
      }
    }
  }
}

function clearFarmPlotGrowthTimers(plot) {
  getPlotTiles(plot).forEach((_, index) => clearPlotGrowthTimer(getFarmPlotTileId(plot.id, index)));
}

function scheduleFarmPlotGrowthTimers(plot) {
  getPlotTiles(plot).forEach((tile, index) => {
    if (tile.stage === FARM_STAGE_GROWING && Number.isFinite(tile.growCompleteAt)) {
      schedulePlotGrowth(tile, getFarmPlotTileId(plot.id, index));
    }
  });
}

function mergeFarmPlots(firstPlot, secondPlot, targetRect) {
  clearFarmPlotGrowthTimers(firstPlot);
  clearFarmPlotGrowthTimers(secondPlot);

  const tiles = Array.from({ length: targetRect.area }, () => createEmptyFarmPlotTile());
  copyFarmPlotTilesInto(tiles, firstPlot, targetRect);
  copyFarmPlotTilesInto(tiles, secondPlot, targetRect);

  firstPlot.left = targetRect.left;
  firstPlot.top = targetRect.top;
  firstPlot.columns = targetRect.columns;
  firstPlot.rows = targetRect.rows;
  firstPlot.tiles = tiles;
  firstPlot.cropId = null;
  firstPlot.stage = FARM_STAGE_EMPTY;
  firstPlot.growCompleteAt = null;

  state.farm.plots = state.farm.plots.filter((plot) => plot.id !== secondPlot.id);
  state.farm.enteringPlotIds = state.farm.enteringPlotIds.filter((plotId) => plotId !== secondPlot.id);
  scheduleFarmPlotGrowthTimers(firstPlot);
}

function getJoinableNeighbor(plot) {
  for (const otherPlot of state.farm.plots) {
    if (otherPlot.id === plot.id) {
      continue;
    }

    const targetRect = getJoinCandidateRect(plot, otherPlot);
    if (!targetRect) {
      continue;
    }

    const isFree = isFarmPlotPositionFreeFromPlots(
      targetRect,
      state.farm.plots,
      plot.id
    ) || state.farm.plots.every((candidate) => (
      candidate.id === plot.id ||
      candidate.id === otherPlot.id ||
      !rectsOverlapWithGap(
        targetRect.left,
        targetRect.top,
        targetRect.columns * FARM_PLOT_SIZE,
        targetRect.rows * FARM_PLOT_SIZE,
        {
          left: candidate.left,
          top: candidate.top,
          width: getFarmPlotSize(candidate).width,
          height: getFarmPlotSize(candidate).height,
        },
        FARM_PLOT_SPAWN_GAP
      )
    ));

    if (isFree) {
      return { otherPlot, targetRect };
    }
  }

  return null;
}

function joinFarmPlotNeighbors(plot) {
  let didJoin = false;
  let currentPlot = plot;

  for (let attempts = 0; attempts < FARM_PLOT_MAX_SPAN * FARM_PLOT_MAX_SPAN; attempts += 1) {
    const joinable = getJoinableNeighbor(currentPlot);
    if (!joinable) {
      break;
    }

    mergeFarmPlots(currentPlot, joinable.otherPlot, joinable.targetRect);
    didJoin = true;
    currentPlot = getPlotById(currentPlot.id);
    if (!currentPlot) {
      break;
    }
  }

  return didJoin;
}

export function moveFarmPlot(plotId, left, top) {
  const plot = state.farm.plots.find((entry) => entry.id === plotId);
  if (!plot) {
    return false;
  }

  const position = clampFarmPlotToWorkspace({ ...plot, left, top });
  plot.left = position.left;
  plot.top = position.top;
  const didJoin = joinFarmPlotNeighbors(plot);
  saveFarmPlots(state.farm.plots);
  state.message = didJoin ? "Farm plots joined." : state.message;
  notify();
  return true;
}

export function getPlotGrowthProgress(plot) {
  if (!plot || plot.stage !== FARM_STAGE_GROWING || !Number.isFinite(plot.growCompleteAt)) {
    return 0;
  }

  const remaining = Math.max(0, plot.growCompleteAt - Date.now());
  const total = getPlotGrowthDurationMs(plot);
  if (total <= 0) {
    return 100;
  }
  return Math.max(0, Math.min(100, Math.round((1 - remaining / total) * 100)));
}

export function spawnFarmPlot(preferredPosition = null, plotSize = {}) {
  const id = `farm-plot-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const dimensions = getFarmPlotSize(plotSize);
  const plotPosition = createFarmPlotRecord(id, {
    ...(preferredPosition || {}),
    columns: dimensions.columns,
    rows: dimensions.rows,
  }, state.farm.plots);
  const plot = {
    id,
    left: plotPosition.left,
    top: plotPosition.top,
    columns: dimensions.columns,
    rows: dimensions.rows,
    tiles: Array.from({ length: dimensions.area }, () => createEmptyFarmPlotTile()),
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
    const plot = state.farm.plots[farmPlotIndex];
    getPlotTiles(plot).forEach((_, index) => clearPlotGrowthTimer(getFarmPlotTileId(plot.id, index)));
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

  if (key === "money") {
    state.message = "Money stays visible.";
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

  if (key === "bakery") {
    state.buildings.bakery = false;
    saveFlag("bakeryBuilt", false);
    state.bakery = { queue: [] };
    saveBakeryState(state.bakery);
    clearBakeryTicker();
    state.message = "Bakery removed.";
    notify();
    return true;
  }

  if (key === "animalFeeder") {
    state.buildings.animalFeeder = false;
    saveFlag("animalFeederBuilt", false);
    resetAnimalFeederTargets();
    state.message = "Animal feeder removed.";
    notify();
    return true;
  }

  if (key === "animalPen") {
    state.buildings.animalPen = false;
    saveFlag("animalPenBuilt", false);
    state.animalPen = { food: {}, animals: [] };
    saveAnimalPenState(state.animalPen);
    clearAnimalPenTicker();
    state.message = "Cow pen removed.";
    notify();
    return true;
  }

  if (key === "chickenCoop") {
    state.buildings.chickenCoop = false;
    saveFlag("chickenCoopBuilt", false);
    state.chickenCoop = { food: {}, animals: [] };
    saveChickenCoopState(state.chickenCoop);
    clearAnimalPenTicker();
    state.message = "Chicken coop removed.";
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
  state.cells.farm = getCenteredStarterFarmPosition();
  const starterLayout = getStarterLayoutPositions();
  state.cells.market = starterLayout.market;
  state.cells.sellMarket = starterLayout.sellMarket;
  state.cells.money = starterLayout.money;
  state.cells.barn = starterLayout.barn;
  state.cells.fastItems = starterLayout.fastItems;
  state.cells.menu = starterLayout.menu;
  state.cells.build = starterLayout.build;
  state.cells.mill = starterLayout.mill;
  state.cells.bakery = starterLayout.bakery;
  state.cells.animalFeeder = starterLayout.animalFeeder;
  state.cells.animalPen = starterLayout.animalPen;
  state.cells.chickenCoop = starterLayout.chickenCoop;
  state.cells.tools = starterLayout.tools;
  saveCellPosition("farm", state.cells.farm);
  saveCellPosition("market", state.cells.market);
  saveCellPosition("sellMarket", state.cells.sellMarket);
  saveCellPosition("money", state.cells.money);
  saveCellPosition("barn", state.cells.barn);
  saveCellPosition("fastItems", state.cells.fastItems);
  saveCellPosition("menu", state.cells.menu);
  saveCellPosition("build", state.cells.build);
  saveCellPosition("mill", state.cells.mill);
  saveCellPosition("bakery", state.cells.bakery);
  saveCellPosition("animalFeeder", state.cells.animalFeeder);
  saveCellPosition("animalPen", state.cells.animalPen);
  saveCellPosition("chickenCoop", state.cells.chickenCoop);
  saveCellPosition("tools", state.cells.tools);
  state.farm.plots = createStarterFarmPlots();
  state.farm.enteringPlotIds = [];
  for (const timerId of growthTimers.values()) {
    window.clearTimeout(timerId);
  }
  growthTimers.clear();
  if (growthTicker) {
    window.clearInterval(growthTicker);
    growthTicker = null;
  }
  clearAnimalPenTicker();
  saveFarmPlots(state.farm.plots);
  state.barn.items = {};
  state.bakery = { queue: [] };
  state.animalPen = { food: {}, animals: [] };
  state.chickenCoop = { food: {}, animals: [] };
  state.shopping.items = {};
  state.sell.items = {};
  state.buildings.mill = false;
  state.buildings.bakery = false;
  state.buildings.animalFeeder = false;
  state.buildings.animalPen = false;
  state.buildings.chickenCoop = false;
  resetAnimalFeederTargets();
  state.ui.hiddenCellKeys = [...DEFAULT_HIDDEN_CELL_KEYS];
  state.ui.activeTool = null;
  state.inventory.selectedItemId = null;
  saveStringArray("hiddenCells", state.ui.hiddenCellKeys);
  saveFlag("millBuilt", false);
  saveFlag("bakeryBuilt", false);
  saveFlag("animalFeederBuilt", false);
  saveFlag("animalPenBuilt", false);
  saveFlag("chickenCoopBuilt", false);
  saveBakeryState(state.bakery);
  saveAnimalPenState(state.animalPen);
  saveChickenCoopState(state.chickenCoop);
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

export function removeAllShoppingItem(productId) {
  if (!state.shopping.items[productId]) {
    return false;
  }

  delete state.shopping.items[productId];
  state.message = "Removed.";
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

    grantBarnItemSilently(productId, quantity);
  }

  autoFeedAnimalPens({ shouldNotify: false });
  state.shopping.items = {};
  state.message = "Purchased.";
  notify();
  return true;
}

export function buyLandPlot(plotSize = {}) {
  const dimensions = getFarmPlotSize(plotSize);
  const cost = getFarmPlotCost(dimensions);
  if (state.coins < cost) {
    state.message = `Need ${cost} coins.`;
    notify();
    return false;
  }

  state.coins -= cost;
  spawnFarmPlot(null, dimensions);
  state.message = `${dimensions.columns}x${dimensions.rows} farm plot bought for ${cost} coins.`;
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
