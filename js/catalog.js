import { CROPS, getCrop, getSeed, SEEDS } from "./seeds.js";

export const MATERIALS = {
  wood: {
    id: "wood",
    category: "materials",
    marketName: "Wood",
    inventoryName: "Wood",
    price: 1,
  },
  nails: {
    id: "nails",
    category: "materials",
    marketName: "Nails",
    inventoryName: "Nails",
    price: 2,
  },
};

export const PROCESSED_GOODS = {
  flour: {
    id: "flour",
    category: "processed",
    marketName: "Flour",
    inventoryName: "Flour",
    price: 0,
    sellPrice: 5,
  },
};

export const PRODUCTS = {
  ...SEEDS,
  ...CROPS,
  ...MATERIALS,
  ...PROCESSED_GOODS,
};

export const MARKET_SECTIONS = [
  {
    key: "seeds",
    label: "Seeds",
    productIds: ["wheatSeed"],
  },
  {
    key: "farmUpgrades",
    label: "Farm upgrades",
    productIds: [],
  },
  {
    key: "materials",
    label: "Materials",
    productIds: ["wood", "nails"],
  },
  {
    key: "sell",
    label: "Sell",
    productIds: [],
  },
];

export function getProduct(productId) {
  return getSeed(productId) || getCrop(productId) || MATERIALS[productId] || PROCESSED_GOODS[productId] || null;
}

export function getProductSellPrice(productId) {
  const product = getProduct(productId);
  return product?.sellPrice || 0;
}
