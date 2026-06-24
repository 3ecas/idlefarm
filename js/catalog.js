import { flour } from "./items/flour.js";
import { bread } from "./items/bread.js";
import { nails } from "./items/nails.js";
import { wood } from "./items/wood.js";
import { ANIMAL_ITEMS, ANIMAL_PRODUCTS, ANIMALS, getAnimal } from "./animals.js";
import { CROP_ITEMS, CROPS, getCrop, getSeed, SEEDS } from "./seeds.js";

export const MATERIALS = {
  wood,
  nails,
};

export const PROCESSED_GOODS = {
  flour,
  bread,
  ...ANIMAL_PRODUCTS,
};

export const PRODUCTS = {
  ...SEEDS,
  ...CROPS,
  ...ANIMALS,
  ...MATERIALS,
  ...PROCESSED_GOODS,
};

export const SHOP_SECTIONS = [
  {
    key: "seeds",
    label: "Seeds",
    productIds: CROP_ITEMS.map(({ seed }) => seed.id),
  },
  {
    key: "animals",
    label: "Animals",
    productIds: ANIMAL_ITEMS.map(({ animal }) => animal.id),
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
];

export const MARKET_SECTIONS = SHOP_SECTIONS;

export function getProduct(productId) {
  return getSeed(productId) || getCrop(productId) || getAnimal(productId) || MATERIALS[productId] || PROCESSED_GOODS[productId] || null;
}

export function getProductSellPrice(productId) {
  const product = getProduct(productId);
  return product?.sellPrice || 0;
}
