import { cabbage } from "./items/cabbage.js";
import { carrot } from "./items/carrot.js";
import { corn } from "./items/corn.js";
import { lettuce } from "./items/lettuce.js";
import { onion } from "./items/onion.js";
import { potato } from "./items/potato.js";
import { wheat } from "./items/wheat.js";
import { strawberry } from "./items/strawberry.js";
import { straw } from "./items/straw.js";

export const CROP_ITEMS = [wheat, cabbage, strawberry, carrot, onion, potato, corn];
const CROP_PRODUCT_ITEMS = [...CROP_ITEMS, straw, lettuce];

export const SEEDS = Object.fromEntries(CROP_ITEMS.map(({ seed }) => [seed.id, seed]));

export const CROPS = Object.fromEntries(CROP_PRODUCT_ITEMS.map(({ crop }) => [crop.id, crop]));

export function getSeed(seedId) {
  return SEEDS[seedId] || null;
}

export function getCrop(cropId) {
  return CROPS[cropId] || null;
}
