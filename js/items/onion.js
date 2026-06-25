const seed = {
  id: "onionSeed",
  category: "seeds",
  marketName: "Onion",
  inventoryName: "Onion seed",
  price: 3,
  cropProductId: "onionCrop",
};

const crop = {
  id: "onionCrop",
  category: "crops",
  marketName: "Onion",
  inventoryName: "Onion",
  price: 0,
  sellPrice: 4,
  growDurationMs: 20000,
  harvestYield: 1,
};

export const onion = {
  seed,
  crop,
  products: [seed, crop],
};
