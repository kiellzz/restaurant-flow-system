const foodImages: Record<string, any> = {
  default: require('../assets/images/foods/default-food.png'),
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
  hotdogpng: require('../assets/images/foods/hotdog.webp'),
  frangoaparmegiana: require('../assets/images/foods/frangoparmegiana.webp'),
  frangoparmegiana: require('../assets/images/foods/frangoparmegiana.webp'),
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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getRemoteImageSource(image?: string) {
  if (!image) {
    return null;
  }

  if (image.startsWith('http')) {
    return { uri: image };
  }

  if (image.startsWith('/uploads/') && API_BASE_URL) {
    return { uri: `${API_BASE_URL}${image}` };
  }

  return null;
}

export function getFoodImage(name: string, image?: string) {
  if (image === 'default-food.png') {
    return foodImages.default;
  }
  const remoteImage = getRemoteImageSource(image);

  if (remoteImage) {
    return remoteImage;
  }

  const key = normalizeName(name);
  return foodImages[key] ?? foodImages.default;
}

export function getCategoryImage(name: string) {
  const key = normalizeName(name);
  return categoryImages[key];
}
