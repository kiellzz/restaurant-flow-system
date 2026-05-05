// utils/imageHelper.ts

export const foodImages: { [key: string]: any } = {
  'meat burger': require('@/assets/images/foods/meat-burger.webp'),
  'fish stew': require('@/assets/images/foods/fish-stew.webp'),
  'fried noodle': require('@/assets/images/foods/fried-noodle.webp'),
  'juice syrup': require('@/assets/images/foods/juice-syrup.webp'),
  // Um placeholder caso você esqueça de adicionar alguma imagem
  'default': require('@/assets/images/foods/placeholder.webp'), 
};

export const getFoodImage = (name: string) => {
  const key = name.toLowerCase().trim();
  return foodImages[key] || foodImages['default'];
};