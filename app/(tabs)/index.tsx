import { BottomBar } from '@/components/BottomBar';
import { CategoryItem } from '@/components/CategoryItem';
import { FoodCard } from '@/components/FoodCard';
import { Header } from '@/components/Header';
import { Colors } from '@/constants/Colors';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CATEGORIES_DATA = [
  { id: '1', name: 'Fish', image: 'https://via.placeholder.com/70' },
  { id: '2', name: 'Rice', image: 'https://via.placeholder.com/70' },
  { id: '3', name: 'Noodle', image: 'https://via.placeholder.com/70' },
  { id: '4', name: 'Burger', image: 'https://via.placeholder.com/70' },
];

const DATA = [
  { id: '1', name: 'Meat Burger', category: 'Snack', price: '$123,45', image: 'https://via.placeholder.com/150' },
  { id: '2', name: 'Fish Stew', category: 'Main Course', price: '$123,45', image: 'https://via.placeholder.com/150' },
  { id: '3', name: 'Fried Noodle', category: 'Main Course', price: '$123,45', image: 'https://via.placeholder.com/150' },
  { id: '4', name: 'Juice Syrup', category: 'Drink', price: '$123,45', image: 'https://via.placeholder.com/150' },
];

export default function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();

  // BottomBar: 80 altura + 20 bottom offset + 16 folga
  const bottomPadding = tabBarHeight + 80 + 20 + 16;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={DATA}
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
                <CategoryItem label={item.name} iconUri={item.image} />
              )}
              contentContainerStyle={styles.categoriesList}
            />
          </View>
        )}
        renderItem={({ item }) => (
          <FoodCard
            name={item.name}
            category={item.category}
            price={item.price}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
      />

      <BottomBar />
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