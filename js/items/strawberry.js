const seed = {
  id: "strawberrySeed",
  category: "seeds",
  icon: "🍓",
  marketName: "Strawberry",
  inventoryName: "Strawberry seed",
  price: 2,
  cropProductId: "strawberryCrop",
};

const crop = {
  id: "strawberryCrop",
  category: "crops",
  icon: "🍓",
  marketName: "Strawberry",
  inventoryName: "Strawberry",
  price: 0,
  sellPrice: 3,
  growDurationMs: 34000,
  harvestYield: 1,
};

export const strawberry = {
  seed,
  crop,
  products: [seed, crop],
};
