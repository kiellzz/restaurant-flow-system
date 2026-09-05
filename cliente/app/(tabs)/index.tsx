import { BottomBar } from '@/components/BottomBar';
import { CategoryItem } from '@/components/CategoryItem';
import {
  DEFAULT_MENU_FILTERS,
  FilterModal,
  hasFunctionalFilters,
  MenuCategoryFilter,
  MenuFilters,
  PriceRangeFilter,
} from '@/components/FilterModal';
import { FoodCard } from '@/components/FoodCard';
import { Header } from '@/components/Header';
import { Colors } from '@/constants/Colors';
import { useCart } from '@/contexts/CartContext';
import { getCategoryImage } from '@/utils/imageHelper';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type MenuItemData = {
  category: MenuCategoryFilter;
  id: string;
  name: string;
  price: number;
};

const CATEGORIES_DATA: { id: MenuCategoryFilter; name: string }[] = [
  { id: 'snack', name: 'Lanches' },
  { id: 'main', name: 'Pratos principais' },
  { id: 'drink', name: 'Bebidas' },
  { id: 'dessert', name: 'Sobremesas' },
];

const CATEGORY_LABELS: Record<MenuCategoryFilter, string> = {
  snack: 'Lanche',
  main: 'Prato principal',
  drink: 'Bebida',
  dessert: 'Sobremesa',
};

const CATEGORY_SEARCH_LABELS: Record<MenuCategoryFilter, string> = {
  snack: 'Lanche Lanches',
  main: 'Prato principal Pratos principais',
  drink: 'Bebida Bebidas',
  dessert: 'Sobremesa Sobremesas',
};

const DATA: MenuItemData[] = [
  // Lanches
  { id: '1', name: 'Hambúrguer', category: 'snack', price: 28.90 },
  { id: '12', name: 'Batata Frita', category: 'snack', price: 18.90 },
  { id: '13', name: 'Coxinha', category: 'snack', price: 8.50 },
  { id: '14', name: 'Hot Dog', category: 'snack', price: 16.90 },

  // Pratos principais
  { id: '2', name: 'Caldeirada', category: 'main', price: 54.90 },
  { id: '3', name: 'Macarrão Frito', category: 'main', price: 32.90 },
  { id: '15', name: 'Frango à Parmegiana', category: 'main', price: 42.90 },
  { id: '16', name: 'Feijoada', category: 'main', price: 39.90 },

  // Bebidas
  { id: '4', name: 'Suco', category: 'drink', price: 9.90 },
  { id: '5', name: 'Refrigerante', category: 'drink', price: 7.50 },
  { id: '6', name: 'Limonada', category: 'drink', price: 8.90 },
  { id: '7', name: 'Milkshake', category: 'drink', price: 18.90 },

  // Sobremesas
  { id: '8', name: 'Cheesecake Oreo', category: 'dessert', price: 21.90 },
  { id: '9', name: 'Açaí', category: 'dessert', price: 19.90 },
  { id: '10', name: 'Brigadeiro', category: 'dessert', price: 6.00 },
  { id: '11', name: 'Brownie', category: 'dessert', price: 14.90 },
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesPriceRange(price: number, priceRange: PriceRangeFilter) {
  switch (priceRange) {
    case 'under15':
      return price <= 15;
    case '15to30':
      return price >= 15 && price <= 30;
    case '30to50':
      return price >= 30 && price <= 50;
    case 'above50':
      return price > 50;
    case 'all':
    default:
      return true;
  }
}

export default function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const bottomPadding = tabBarHeight + 80 + 20 + 16;

  const { addItem, cart, removeItem, totalItems, totalPrice } = useCart();
  const [filters, setFilters] = React.useState<MenuFilters>(DEFAULT_MENU_FILTERS);
  const [filtersVisible, setFiltersVisible] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const hasActiveFilters = React.useMemo(() => hasFunctionalFilters(filters), [filters]);

  const filteredData = React.useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    const nextData = DATA.filter(item => {
      const itemName = normalizeText(item.name);
      const itemCategory = normalizeText(CATEGORY_SEARCH_LABELS[item.category]);
      const matchesSearch =
        !normalizedSearch ||
        itemName.includes(normalizedSearch) ||
        itemCategory.includes(normalizedSearch);
      const matchesCategory = !filters.category || item.category === filters.category;
      const matchesPrice = matchesPriceRange(item.price, filters.priceRange);

      return matchesSearch && matchesCategory && matchesPrice;
    });

    if (filters.sort === 'priceAsc') {
      return [...nextData].sort((a, b) => a.price - b.price);
    }

    if (filters.sort === 'priceDesc') {
      return [...nextData].sort((a, b) => b.price - a.price);
    }

    return nextData;
  }, [filters, searchTerm]);

  function handleApplyFilters(nextFilters: MenuFilters) {
    setFilters(nextFilters);
    setFiltersVisible(false);
  }

  function handleClearFilters() {
    setFilters(DEFAULT_MENU_FILTERS);
  }

  function handleClearCategory() {
    setFilters(prev => ({
      ...prev,
      category: null,
    }));
  }

  function handleClearEmptyState() {
    setFilters(DEFAULT_MENU_FILTERS);
    setSearchTerm('');
  }

  function handleCategoryPress(category: MenuCategoryFilter) {
    setFilters(prev => ({
      ...prev,
      category: prev.category === category ? null : category,
    }));
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={() => (
          <View style={styles.headerArea}>
            <Header
              hasActiveFilters={hasActiveFilters}
              onOpenFilters={() => setFiltersVisible(true)}
              onSearchChange={setSearchTerm}
              searchTerm={searchTerm}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categorias</Text>
              <TouchableOpacity activeOpacity={0.75} onPress={handleClearCategory}>
                <Text style={styles.seeAllText}>Ver tudo →</Text>
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
                  isSelected={filters.category === item.id}
                  onPress={() => handleCategoryPress(item.id)}
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
              category={CATEGORY_LABELS[item.category] ?? item.category}
              price={item.price}
              quantity={quantity}
              onAdd={() => addItem(item)}
              onRemove={() => removeItem(item.id)}
            />
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="search" size={34} color={Colors.cardOrange} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum item encontrado</Text>
            <Text style={styles.emptyDescription}>
              Tente ajustar os filtros ou buscar por outro termo
            </Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleClearEmptyState}
              style={styles.emptyButton}
            >
              <Text style={styles.emptyButtonText}>Limpar filtros</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={[
          styles.list,
          filteredData.length === 0 && styles.emptyList,
          { paddingBottom: bottomPadding },
        ]}
      />

      <FilterModal
        filters={filters}
        visible={filtersVisible}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        onClose={() => setFiltersVisible(false)}
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
  emptyList: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#242424',
    borderColor: '#333',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    padding: 24,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderColor: '#363636',
    borderRadius: 22,
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    marginBottom: 14,
    width: 62,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyDescription: {
    color: Colors.textGray,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyButton: {
    alignItems: 'center',
    backgroundColor: Colors.accentRed,
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 50,
    paddingHorizontal: 22,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
});
