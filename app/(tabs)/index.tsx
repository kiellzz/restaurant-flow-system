import { BottomBar } from '@/components/BottomBar';
import { CategoryItem } from '@/components/CategoryItem';
import { FoodCard } from '@/components/FoodCard';
import { Header } from '@/components/Header';
import { Colors } from '@/constants/Colors';
import { getCategoryImage } from '@/utils/imageHelper';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CATEGORIES_DATA = [
  { id: 'snack', name: 'Snacks' },
  { id: 'main', name: 'Main Courses' },
  { id: 'drink', name: 'Drinks' },
  { id: 'dessert', name: 'Desserts' },
];

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Cart = Record<string, CartItem>;

const DATA = [
  // Snacks
  { id: '1', name: 'Meat Burger', category: 'snack', price: 123.45 },

  // main Courses
  { id: '2', name: 'Fish Stew', category: 'main', price: 123.45 },
  { id: '3', name: 'Fried Noodle', category: 'main', price: 123.45 },

  // drinks
  { id: '4', name: 'Juice Syrup', category: 'drink', price: 123.45 },
  { id: '5', name: 'Soda', category: 'drink', price: 123.45 },
  { id: '6', name: 'Lemonade', category: 'drink', price: 123.45 },
  { id: '7', name: 'Milkshake', category: 'drink', price: 123.45 },

  // desserts
  { id: '8', name: 'Oreo Chessecake', category: 'dessert', price: 123.45 },
  { id: '9', name: 'Açaí', category: 'dessert', price: 123.45 },
  { id: '10', name: 'Brigadeiro', category: 'dessert', price: 123.45 },
  { id: '11', name: 'Brownie', category: 'dessert', price: 123.45 },
];

export default function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const bottomPadding = tabBarHeight + 80 + 20 + 16;

  const [cart, setCart] = React.useState<Cart>({});
  const [selectedCategory, setSelectedCategory] = React.useState<string>('snack');

  const addItem = (item: { id: string; name: string; price: number }) => {
    setCart(prev => {
      const existing = prev[item.id];

      if (existing) {
        return {
          ...prev,
          [item.id]: {
            ...existing,
            quantity: existing.quantity + 1,
          },
        };
      }

      return {
        ...prev,
        [item.id]: {
          ...item,
          quantity: 1,
        },
      };
    });
  };

  const removeItem = (id: string) => {
    setCart(prev => {
      const existing = prev[id];

      if (!existing) return prev;

      if (existing.quantity === 1) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }

      return {
        ...prev,
        [id]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  };

  const totalItems = Object.values(cart).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const totalPrice = Object.values(cart).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const filteredData = DATA.filter(item => item.category === selectedCategory);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={() => (
          <View style={styles.headerArea}>
            <Header />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All →</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              horizontal
              data={CATEGORIES_DATA}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <CategoryItem
                  label={item.name}
                  iconSource={getCategoryImage(item.id)}
                  isSelected={selectedCategory === item.id}
                  onPress={() => setSelectedCategory(item.id)}
                />
              )}
              contentContainerStyle={styles.categoriesList}
            />
          </View>
        )}
        renderItem={({ item }) => {
          const quantity = cart[item.id]?.quantity || 0;

          return (
            <FoodCard
              name={item.name}
              category={item.category}
              price={item.price}
              quantity={quantity}
              onAdd={() => addItem(item)}
              onRemove={() => removeItem(item.id)}
            />
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
      />

      <BottomBar
        totalItems={totalItems}
        totalPrice={totalPrice}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerArea: {
    marginBottom: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: '#FFF',
    opacity: 0.8,
    fontSize: 14,
  },
  categoriesList: {
    paddingBottom: 10,
  },
});