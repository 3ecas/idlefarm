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
  sellPrice: 1,
  growDurationMs: 82000,
  harvestYield: 3,
};

export const onion = {
  seed,
  crop,
  products: [seed, crop],
};
