export const SEEDS = {
  wheatSeed: {
    id: "wheatSeed",
    category: "seeds",
    marketName: "Wheat",
    inventoryName: "Wheat seed",
    price: 1,
    cropProductId: "wheatCrop",
  },
};

export const CROPS = {
  wheatCrop: {
    id: "wheatCrop",
    category: "crops",
    marketName: "Wheat",
    inventoryName: "Wheat",
    price: 0,
    sellPrice: 2,
  },
};

export function getSeed(seedId) {
  return SEEDS[seedId] || null;
}

export function getCrop(cropId) {
  return CROPS[cropId] || null;
}
