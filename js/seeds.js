import { cabbage } from "./items/cabbage.js";
import { wheat } from "./items/wheat.js";
import { strawberry } from "./items/strawberry.js";
import { straw } from "./items/straw.js";

export const CROP_ITEMS = [wheat, cabbage, strawberry, straw];

export const SEEDS = Object.fromEntries(CROP_ITEMS.map(({ seed }) => [seed.id, seed]));

export const CROPS = Object.fromEntries(CROP_ITEMS.map(({ crop }) => [crop.id, crop]));

export function getSeed(seedId) {
  return SEEDS[seedId] || null;
}

export function getCrop(cropId) {
  return CROPS[cropId] || null;
}
