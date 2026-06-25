const seed = {
  id: "carrotSeed",
  category: "seeds",
  marketName: "Carrot",
  inventoryName: "Carrot seed",
  price: 2,
  cropProductId: "carrotCrop",
};

const crop = {
  id: "carrotCrop",
  category: "crops",
  marketName: "Carrot",
  inventoryName: "Carrot",
  price: 0,
  sellPrice: 2,
  growDurationMs: 66000,
  harvestYield: 3,
};

export const carrot = {
  seed,
  crop,
  products: [seed, crop],
};
