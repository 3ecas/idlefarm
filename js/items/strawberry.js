const seed = {
  id: "strawberrySeed",
  category: "seeds",
  marketName: "Strawberry",
  inventoryName: "Strawberry seed",
  price: 3,
  cropProductId: "strawberryCrop",
};

const crop = {
  id: "strawberryCrop",
  category: "crops",
  marketName: "Strawberry",
  inventoryName: "Strawberry",
  price: 0,
  sellPrice: 4,
  growDurationMs: 30000,
  harvestYield: 1,
};

export const strawberry = {
  seed,
  crop,
  products: [seed, crop],
};
