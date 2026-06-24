import { cow } from "./items/cow.js";

export const ANIMAL_ITEMS = [cow];

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
