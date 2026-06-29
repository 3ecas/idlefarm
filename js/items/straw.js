const seed = {
  id: "strawSeed",
  category: "seeds",
  icon: "🌾",
  marketName: "Straw",
  inventoryName: "Straw seed",
  price: 2,
  cropProductId: "strawCrop",
};

const crop = {
  id: "strawCrop",
  category: "crops",
  icon: "🌾",
  marketName: "Straw",
  inventoryName: "Straw",
  price: 0,
  sellPrice: 0,
  growDurationMs: 15000,
  harvestYield: 2,
};

export const straw = {
  seed,
  crop,
  products: [seed, crop],
};
