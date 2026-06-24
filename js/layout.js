export const CELL_SIZES = {
  farm: { width: 72, height: 72 },
  market: { width: 320, height: 136 },
  sellMarket: { width: 260, height: 156 },
  shopping: { width: 176, height: 144 },
  barn: { width: 176, height: 196 },
  money: { width: 128, height: 72 },
  menu: { width: 280, height: 72 },
  build: { width: 176, height: 228 },
  mill: { width: 176, height: 128 },
  bakery: { width: 176, height: 156 },
  animalPen: { width: 208, height: 196 },
  tools: { width: 150, height: 72 },
};

export function getCellSize(key) {
  return CELL_SIZES[key] || { width: 160, height: 120 };
}
