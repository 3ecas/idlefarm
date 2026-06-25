const seed = {
  id: "carrotSeed",
  category: "seeds",
  marketName: "Carrot",
  inventoryName: "Carrot seed",
  price: 1,
  cropProductId: "carrotCrop",
};

const crop = {
  id: "carrotCrop",
  category: "crops",
  marketName: "Carrot",
  inventoryName: "Carrot",
  price: 0,
  sellPrice: 2,
  growDurationMs: 12000,
  harvestYield: 1,
};

export const carrot = {
  seed,
  crop,
  products: [seed, crop],
};
