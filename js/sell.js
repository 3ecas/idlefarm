import { addSellItem } from "./state.js";

export function getSellCellFromPoint(x, y) {
  const element = document.elementFromPoint(x, y);
  return element?.closest?.("[data-market-sell-drop]") || null;
}

export function addProductToSellStand(productId) {
  return addSellItem(productId, 1);
}
