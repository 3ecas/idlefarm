import { egg } from "./egg.js";

const animal = {
  id: "chicken",
  category: "animals",
  marketName: "Chicken",
  inventoryName: "Chicken",
  price: 25,
  outputProductId: egg.id,
  penBuildingId: "chickenCoop",
};

export const chicken = {
  animal,
  product: egg,
  products: [animal, egg],
};
