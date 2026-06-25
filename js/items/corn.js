const seed = {
  id: "cornSeed",
  category: "seeds",
  marketName: "Corn",
  inventoryName: "Corn seed",
  price: 3,
  cropProductId: "cornCrop",
};

const crop = {
  id: "cornCrop",
  category: "crops",
  marketName: "Corn",
  inventoryName: "Corn",
  price: 0,
  sellPrice: 1,
  growDurationMs: 140000,
  harvestYield: 4,
};

export const corn = {
  seed,
  crop,
  products: [seed, crop],
};
