import { milk } from "./milk.js";

const animal = {
  id: "cow",
  category: "animals",
  marketName: "Cow",
  inventoryName: "Cow",
  price: 12,
  outputProductId: milk.id,
};

export const cow = {
  animal,
  product: milk,
  products: [animal, milk],
};
