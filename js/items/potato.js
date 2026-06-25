const seed = {
  id: "potatoSeed",
  category: "seeds",
  marketName: "Potato",
  inventoryName: "Potato seed",
  price: 3,
  cropProductId: "potatoCrop",
};

const crop = {
  id: "potatoCrop",
  category: "crops",
  marketName: "Potato",
  inventoryName: "Potato",
  price: 0,
  sellPrice: 3,
  growDurationMs: 120000,
  harvestYield: 3,
};

export const potato = {
  seed,
  crop,
  products: [seed, crop],
};
