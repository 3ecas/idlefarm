import { cow } from "./items/cow.js";
import { chicken } from "./items/chicken.js";

export const ANIMAL_ITEMS = [cow, chicken];

export const ANIMALS = Object.fromEntries(ANIMAL_ITEMS.map(({ animal }) => [animal.id, animal]));

export const ANIMAL_PRODUCTS = Object.fromEntries(
  ANIMAL_ITEMS.flatMap(({ products }) =>
    products
      .filter((product) => product.category !== "animals")
      .map((product) => [product.id, product])
  )
);

export function getAnimal(animalId) {
  return ANIMALS[animalId] || null;
}

export function getAnimalProduct(productId) {
  return ANIMAL_PRODUCTS[productId] || null;
}
