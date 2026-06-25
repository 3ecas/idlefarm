import { milk } from "./milk.js";

const animal = {
  id: "cow",
  category: "animals",
  marketName: "Cow",
  inventoryName: "Cow",
  price: 55,
  outputProductId: milk.id,
  penBuildingId: "animalPen",
};

export const cow = {
  animal,
  product: milk,
  products: [animal, milk],
};
