const seed = {
  id: "cabbageSeed",
  category: "seeds",
  marketName: "Cabbage",
  inventoryName: "Cabbage seed",
  price: 2,
  cropProductId: "cabbageCrop",
};

const crop = {
  id: "cabbageCrop",
  category: "crops",
  marketName: "Cabbage",
  inventoryName: "Cabbage",
  price: 0,
  sellPrice: 2,
  growDurationMs: 16000,
  harvestYield: 2,
};

export const cabbage = {
  seed,
  crop,
  products: [seed, crop],
};
