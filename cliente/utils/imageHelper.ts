const foodImages: Record<string, any> = {
  meatburger: require('../assets/images/foods/meatburger.webp'),
  hamburguer: require('../assets/images/foods/meatburger.webp'),
  fishstew: require('../assets/images/foods/fishstew.webp'),
  caldeirada: require('../assets/images/foods/fishstew.webp'),
  friednoodle: require('../assets/images/foods/friednoodle.webp'),
  macarraofrito: require('../assets/images/foods/friednoodle.webp'),
  juicesyrup: require('../assets/images/foods/juicesyrup.webp'),
  suco: require('../assets/images/foods/juicesyrup.webp'),

  barbecue: require('../assets/images/foods/barbecue.webp'),
  fries: require('../assets/images/foods/fries.webp'),
  batatafrita: require('../assets/images/foods/fries.webp'),
  coxinha: require('../assets/images/foods/coxinha.webp'),
  hotdog: require('../assets/images/foods/hotdog.webp'),
  frangoaparmegiana: require('../assets/images/foods/frangoparmegiana.webp'),
  feijoada: require('../assets/images/foods/feijoada.webp'),

  acai: require('../assets/images/foods/açaí.webp'),
  brigadeiro: require('../assets/images/foods/brigadeiro.webp'),
  brownie: require('../assets/images/foods/brownie.webp'),
  lemonade: require('../assets/images/foods/lemonade.webp'),
  limonada: require('../assets/images/foods/lemonade.webp'),
  milkshake: require('../assets/images/foods/milkshake.webp'),

  oreochessecake: require('../assets/images/foods/oreochessecake.webp'),
  cheesecakeoreo: require('../assets/images/foods/oreochessecake.webp'),

  soda: require('../assets/images/foods/soda.webp'),
  refrigerante: require('../assets/images/foods/soda.webp'),
  water: require('../assets/images/foods/water.webp'),
};

const categoryImages: Record<string, any> = {
  snack: require('../assets/images/categories/snacks.webp'),
  main: require('../assets/images/categories/maincourses.webp'),
  drink: require('../assets/images/categories/drinks.webp'),
  dessert: require('../assets/images/categories/desserts.webp'),
};

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function getFoodImage(name: string) {
  const key = normalizeName(name);
  return foodImages[key];
}

export function getCategoryImage(name: string) {
  const key = normalizeName(name);
  return categoryImages[key];
}
