const seed = {
  id: "lettuceSeed",
  category: "seeds",
  marketName: "Lettuce",
  inventoryName: "Lettuce seed",
  price: 2,
  cropProductId: "lettuceCrop",
};

const crop = {
  id: "lettuceCrop",
  category: "crops",
  marketName: "Lettuce",
  inventoryName: "Lettuce",
  price: 0,
  sellPrice: 3,
  growDurationMs: 16000,
  harvestYield: 1,
};

export const lettuce = {
  seed,
  crop,
  products: [seed, crop],
};
