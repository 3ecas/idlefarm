const seed = {
  id: "wheatSeed",
  category: "seeds",
  marketName: "Wheat",
  inventoryName: "Wheat seed",
  price: 1,
  cropProductId: "wheatCrop",
};

const crop = {
  id: "wheatCrop",
  category: "crops",
  marketName: "Wheat",
  inventoryName: "Wheat",
  price: 0,
  sellPrice: 2,
  growDurationMs: 10000,
  harvestYield: 1,
};

export const wheat = {
  seed,
  crop,
  products: [seed, crop],
};
