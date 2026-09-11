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
import { ItemCustomizationModal } from '@/components/ItemCustomizationModal';
import { mapApiMenuItem, type MenuItemData } from '@/utils/menuItem';
import {
  fetchMenuItems,
  subscribeToRealtimeEvents,
} from '@/services/api';
import { getCategoryImage } from '@/utils/imageHelper';
import { useBottomTabBarHeight } from 'expo-router/build/react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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

  const {
    addItem,
    getItemQuantity,
    removeItemByMenuId,
    totalItems,
    totalPrice,
  } = useCart();
  const [filters, setFilters] = React.useState<MenuFilters>(DEFAULT_MENU_FILTERS);
  const [filtersVisible, setFiltersVisible] = React.useState(false);
  const [isLoadingMenu, setIsLoadingMenu] = React.useState(true);
  const [menuError, setMenuError] = React.useState('');
  const [menuItems, setMenuItems] = React.useState<MenuItemData[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [customizingItem, setCustomizingItem] = React.useState<MenuItemData | null>(null);
  const loadMenu = React.useCallback(async () => {
    setIsLoadingMenu(true);
    setMenuError('');

    try {
      const items = await fetchMenuItems();
      setMenuItems(items.filter(item => item.disponivel).map(mapApiMenuItem));
    } catch (error) {
      console.error(error);
      setMenuError('Não foi possível carregar o cardápio.');
    } finally {
      setIsLoadingMenu(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => void loadMenu(), 0);
    return () => clearTimeout(timer);
  }, [loadMenu]);

  React.useEffect(() => (
    subscribeToRealtimeEvents(event => {
      if (event.type === 'menu:changed' || event.type === 'demo:reset') {
        loadMenu();
      }
    })
  ), [loadMenu]);

  const hasActiveFilters = React.useMemo(() => hasFunctionalFilters(filters), [filters]);

  const filteredData = React.useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    const nextData = menuItems.filter(item => {
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
  }, [filters, menuItems, searchTerm]);

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

  function openCustomizationModal(item: MenuItemData) {
    setCustomizingItem(item);
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
          const quantity = item.tipo === 'com_acompanhamento' ? 0 : getItemQuantity(item.id);

          return (
            <FoodCard
              name={item.name}
              category={CATEGORY_LABELS[item.category] ?? item.category}
              image={item.image}
              price={item.price}
              quantity={quantity}
              onAdd={() => openCustomizationModal(item)}
              onRemove={() => removeItemByMenuId(item.id)}
            />
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              {isLoadingMenu ? (
                <ActivityIndicator color={Colors.cardOrange} />
              ) : (
                <Feather name="search" size={34} color={Colors.cardOrange} />
              )}
            </View>
            <Text style={styles.emptyTitle}>
              {isLoadingMenu
                ? 'Carregando cardápio'
                : menuError
                  ? 'Cardápio indisponível'
                  : 'Nenhum item encontrado'}
            </Text>
            <Text style={styles.emptyDescription}>
              {isLoadingMenu
                ? 'Buscando os itens mais recentes do restaurante'
                : menuError || 'Tente ajustar os filtros ou buscar por outro termo'}
            </Text>
            {!isLoadingMenu && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={menuError ? loadMenu : handleClearEmptyState}
                style={styles.emptyButton}
              >
                <Text style={styles.emptyButtonText}>
                  {menuError ? 'Tentar novamente' : 'Limpar filtros'}
                </Text>
              </TouchableOpacity>
            )}
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

      {customizingItem && (
        <ItemCustomizationModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onSave={(item, config) => { addItem(item, config); setCustomizingItem(null); }}
        />
      )}

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
