const seed = {
  id: "strawSeed",
  category: "seeds",
  marketName: "Straw",
  inventoryName: "Straw seed",
  price: 2,
  cropProductId: "strawCrop",
};

const crop = {
  id: "strawCrop",
  category: "crops",
  marketName: "Straw",
  inventoryName: "Straw",
  price: 0,
  sellPrice: 1,
  growDurationMs: 15000,
  harvestYield: 2,
};

export const straw = {
  seed,
  crop,
  products: [seed, crop],
};
