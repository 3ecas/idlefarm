import { egg } from "./egg.js";

const animal = {
  id: "chicken",
  category: "animals",
  icon: "🐔",
  marketName: "Chicken",
  inventoryName: "Chicken",
  price: 25,
  sellPrice: 3,
  outputProductId: egg.id,
  penBuildingId: "chickenCoop",
};

export const chicken = {
  animal,
  product: egg,
  products: [animal, egg],
};
