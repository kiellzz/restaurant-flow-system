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
import type { MenuItemTipo, SelectedOptionSnapshot } from '@/contexts/CartContext';
import {
  ApiMenuCategory,
  ApiMenuItem,
  ApiMenuItemOptionGroup,
  fetchMenuItems,
  subscribeToRealtimeEvents,
} from '@/services/api';
import { getCategoryImage } from '@/utils/imageHelper';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type MenuItemData = {
  category: MenuCategoryFilter;
  gruposOpcoes: ApiMenuItemOptionGroup[];
  id: string;
  image: string;
  name: string;
  price: number;
  tipo: MenuItemTipo;
};

const API_CATEGORY_TO_FILTER: Record<ApiMenuCategory, MenuCategoryFilter> = {
  Lanches: 'snack',
  'Pratos principais': 'main',
  Bebidas: 'drink',
  Sobremesas: 'dessert',
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

function formatPrice(price: number) {
  return price.toFixed(2).replace('.', ',');
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function mapApiMenuItem(item: ApiMenuItem): MenuItemData {
  return {
    category: API_CATEGORY_TO_FILTER[item.categoria],
    gruposOpcoes: (item.gruposOpcoes ?? []).map(group => ({
      nome: group.nome,
      obrigatorio: Boolean(group.obrigatorio),
      opcoes: (group.opcoes ?? []).map(option => ({
        nome: option.nome,
        precoAdicional: option.precoAdicional ?? 0,
      })),
      permiteQuantidade: Boolean(group.permiteQuantidade),
      tipo: group.tipo ?? 'unica',
    })),
    id: item._id,
    image: item.imagem,
    name: item.nome,
    price: item.precoComDesconto ?? item.preco,
    tipo: item.tipo ?? 'simples',
  };
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
  const [customizationObservation, setCustomizationObservation] = React.useState('');
  const [singleSelections, setSingleSelections] = React.useState<Record<string, number>>({});
  const [multipleSelections, setMultipleSelections] = React.useState<Record<string, Record<string, number>>>({});

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
    loadMenu();
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
    setCustomizationObservation('');
    setSingleSelections({});
    setMultipleSelections({});
  }

  function closeCustomizationModal() {
    setCustomizingItem(null);
    setCustomizationObservation('');
    setSingleSelections({});
    setMultipleSelections({});
  }

  function selectSingleOption(groupIndex: number, optionIndex: number) {
    setSingleSelections(prev => ({
      ...prev,
      [String(groupIndex)]: optionIndex,
    }));
  }

  function toggleMultipleOption(groupIndex: number, optionIndex: number) {
    const groupKey = String(groupIndex);
    const optionKey = String(optionIndex);

    setMultipleSelections(prev => {
      const currentGroup = prev[groupKey] ?? {};
      const nextGroup = { ...currentGroup };

      if (nextGroup[optionKey]) {
        delete nextGroup[optionKey];
      } else {
        nextGroup[optionKey] = 1;
      }

      return {
        ...prev,
        [groupKey]: nextGroup,
      };
    });
  }

  function changeMultipleOptionQuantity(groupIndex: number, optionIndex: number, change: number) {
    const groupKey = String(groupIndex);
    const optionKey = String(optionIndex);

    setMultipleSelections(prev => {
      const currentGroup = prev[groupKey] ?? {};
      const currentQuantity = currentGroup[optionKey] ?? 1;

      return {
        ...prev,
        [groupKey]: {
          ...currentGroup,
          [optionKey]: Math.max(1, currentQuantity + change),
        },
      };
    });
  }

  function buildSelectedOptions(item: MenuItemData): SelectedOptionSnapshot[] {
    return item.gruposOpcoes.flatMap((group, groupIndex) => {
      const groupKey = String(groupIndex);

      if (group.tipo === 'unica') {
        const optionIndex = singleSelections[groupKey];
        const option = optionIndex === undefined ? null : group.opcoes[optionIndex];

        return option ? [{
          grupoNome: group.nome,
          opcaoNome: option.nome,
          precoAdicional: option.precoAdicional ?? 0,
          quantidade: 1,
        }] : [];
      }

      const selectedGroupOptions = multipleSelections[groupKey] ?? {};

      return Object.entries(selectedGroupOptions)
        .map(([optionIndex, quantity]) => {
          const option = group.opcoes[Number(optionIndex)];

          return option ? {
            grupoNome: group.nome,
            opcaoNome: option.nome,
            precoAdicional: option.precoAdicional ?? 0,
            quantidade: Math.max(1, quantity),
          } : null;
        })
        .filter((option): option is SelectedOptionSnapshot => Boolean(option));
    });
  }

  const customizationTotal = React.useMemo(() => {
    if (!customizingItem) {
      return 0;
    }

    const optionsTotal = buildSelectedOptions(customizingItem).reduce((sum, option) => (
      sum + option.precoAdicional * option.quantidade
    ), 0);

    return roundCurrency(customizingItem.price + optionsTotal);
  }, [customizingItem, multipleSelections, singleSelections]);

  const isCustomizationValid = React.useMemo(() => {
    if (!customizingItem || customizingItem.tipo === 'simples') {
      return true;
    }

    return customizingItem.gruposOpcoes.every((group, groupIndex) => {
      if (!group.obrigatorio) {
        return true;
      }

      const groupKey = String(groupIndex);

      if (group.tipo === 'unica') {
        return singleSelections[groupKey] !== undefined;
      }

      return Object.keys(multipleSelections[groupKey] ?? {}).length > 0;
    });
  }, [customizingItem, multipleSelections, singleSelections]);

  function addCustomizedItemToCart() {
    if (!customizingItem || !isCustomizationValid) {
      return;
    }

    addItem(customizingItem, {
      observacao: customizationObservation,
      opcoesSelecionadas: buildSelectedOptions(customizingItem),
      precoUnitarioFinal: customizationTotal,
    });
    closeCustomizationModal();
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

      <Modal
        animationType="slide"
        onRequestClose={closeCustomizationModal}
        transparent
        visible={Boolean(customizingItem)}
      >
        <View style={styles.customizationOverlay}>
          <Pressable
            accessibilityLabel="Fechar personalização"
            onPress={closeCustomizationModal}
            style={styles.customizationBackdrop}
          />

          {customizingItem && (
            <View style={styles.customizationSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.customizationHeader}>
                <View style={styles.customizationTitleBlock}>
                  <Text style={styles.customizationEyebrow}>
                    {customizingItem.tipo === 'com_acompanhamento' ? 'Personalizar item' : 'Observação'}
                  </Text>
                  <Text style={styles.customizationTitle} numberOfLines={2}>
                    {customizingItem.name}
                  </Text>
                </View>

                <TouchableOpacity
                  accessibilityLabel="Fechar personalização"
                  activeOpacity={0.8}
                  onPress={closeCustomizationModal}
                  style={styles.closeModalButton}
                >
                  <Feather name="x" size={22} color={Colors.white} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.customizationContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {customizingItem.tipo === 'com_acompanhamento' && customizingItem.gruposOpcoes.map((group, groupIndex) => {
                  const groupKey = String(groupIndex);

                  return (
                    <View key={`${group.nome}-${groupIndex}`} style={styles.optionGroup}>
                      <View style={styles.optionGroupHeader}>
                        <Text style={styles.optionGroupTitle}>{group.nome}</Text>
                        {group.obrigatorio && (
                          <Text style={styles.requiredPill}>Obrigatório</Text>
                        )}
                      </View>

                      <View style={styles.optionList}>
                        {group.opcoes.map((option, optionIndex) => {
                          const optionKey = String(optionIndex);
                          const optionPrice = option.precoAdicional ?? 0;
                          const multipleQuantity = multipleSelections[groupKey]?.[optionKey] ?? 0;
                          const isSelected = group.tipo === 'unica'
                            ? singleSelections[groupKey] === optionIndex
                            : multipleQuantity > 0;

                          return (
                            <View key={`${option.nome}-${optionIndex}`} style={styles.optionRowWrap}>
                              <TouchableOpacity
                                accessibilityRole={group.tipo === 'unica' ? 'radio' : 'checkbox'}
                                accessibilityState={{ checked: isSelected }}
                                activeOpacity={0.86}
                                onPress={() => (
                                  group.tipo === 'unica'
                                    ? selectSingleOption(groupIndex, optionIndex)
                                    : toggleMultipleOption(groupIndex, optionIndex)
                                )}
                                style={[
                                  styles.optionRow,
                                  isSelected && styles.optionRowSelected,
                                ]}
                              >
                                <View style={[
                                  group.tipo === 'unica' ? styles.radioOuter : styles.checkboxOuter,
                                  isSelected && styles.optionMarkSelected,
                                ]}>
                                  {isSelected && (
                                    group.tipo === 'unica'
                                      ? <View style={styles.radioInner} />
                                      : <Feather name="check" size={14} color={Colors.white} />
                                  )}
                                </View>

                                <Text style={styles.optionName}>{option.nome}</Text>
                                {optionPrice > 0 && (
                                  <Text style={styles.optionPrice}>+ R$ {formatPrice(optionPrice)}</Text>
                                )}
                              </TouchableOpacity>

                              {group.tipo === 'multipla' && group.permiteQuantidade && isSelected && (
                                <View style={styles.optionQuantity}>
                                  <TouchableOpacity
                                    accessibilityLabel={`Diminuir ${option.nome}`}
                                    activeOpacity={0.82}
                                    onPress={() => changeMultipleOptionQuantity(groupIndex, optionIndex, -1)}
                                    style={styles.optionQuantityButton}
                                  >
                                    <Feather name="minus" size={16} color={Colors.white} />
                                  </TouchableOpacity>
                                  <Text style={styles.optionQuantityText}>{multipleQuantity}</Text>
                                  <TouchableOpacity
                                    accessibilityLabel={`Aumentar ${option.nome}`}
                                    activeOpacity={0.82}
                                    onPress={() => changeMultipleOptionQuantity(groupIndex, optionIndex, 1)}
                                    style={styles.optionQuantityButton}
                                  >
                                    <Feather name="plus" size={16} color={Colors.white} />
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}

                <View style={styles.observationBlock}>
                  <Text style={styles.observationLabel}>Observação</Text>
                  <TextInput
                    multiline
                    onChangeText={setCustomizationObservation}
                    placeholder="Ex: tirar cebola, ponto da carne, molho separado"
                    placeholderTextColor="#777"
                    style={styles.observationInput}
                    textAlignVertical="top"
                    value={customizationObservation}
                  />
                </View>
              </ScrollView>

              <View style={styles.customizationFooter}>
                <View>
                  <Text style={styles.totalLabel}>Total do item</Text>
                  <Text style={styles.totalValue}>R$ {formatPrice(customizationTotal)}</Text>
                </View>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !isCustomizationValid }}
                  activeOpacity={0.9}
                  disabled={!isCustomizationValid}
                  onPress={addCustomizedItemToCart}
                  style={[
                    styles.addCustomizedButton,
                    !isCustomizationValid && styles.addCustomizedButtonDisabled,
                  ]}
                >
                  <Text style={styles.addCustomizedText}>Adicionar ao carrinho</Text>
                  <Feather name="shopping-cart" size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

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
  customizationOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  customizationBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  customizationSheet: {
    backgroundColor: '#121212',
    borderColor: '#292929',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '88%',
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: '#4A4A4A',
    borderRadius: 10,
    height: 5,
    marginBottom: 18,
    width: 46,
  },
  customizationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  customizationTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  customizationEyebrow: {
    color: Colors.cardOrange,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  customizationTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    marginTop: 2,
  },
  closeModalButton: {
    alignItems: 'center',
    backgroundColor: '#242424',
    borderColor: '#333',
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  customizationContent: {
    gap: 14,
    paddingBottom: 16,
    paddingTop: 18,
  },
  optionGroup: {
    backgroundColor: '#202020',
    borderColor: '#333',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  optionGroupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  optionGroupTitle: {
    color: Colors.white,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  requiredPill: {
    backgroundColor: '#331818',
    borderColor: 'rgba(255, 0, 0, 0.45)',
    borderRadius: 999,
    borderWidth: 1,
    color: Colors.white,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  optionList: {
    gap: 9,
  },
  optionRowWrap: {
    gap: 8,
  },
  optionRow: {
    alignItems: 'center',
    backgroundColor: '#181818',
    borderColor: '#303030',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionRowSelected: {
    backgroundColor: '#2A2116',
    borderColor: Colors.cardOrange,
  },
  radioOuter: {
    alignItems: 'center',
    borderColor: '#626262',
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxOuter: {
    alignItems: 'center',
    borderColor: '#626262',
    borderRadius: 7,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  optionMarkSelected: {
    backgroundColor: Colors.cardOrange,
    borderColor: Colors.cardOrange,
  },
  radioInner: {
    backgroundColor: Colors.white,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  optionName: {
    color: Colors.white,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  optionPrice: {
    color: Colors.cardOrange,
    fontSize: 13,
    fontWeight: '900',
  },
  optionQuantity: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#181818',
    borderColor: '#333',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 6,
  },
  optionQuantityButton: {
    alignItems: 'center',
    backgroundColor: Colors.accentRed,
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  optionQuantityText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '900',
    minWidth: 26,
    textAlign: 'center',
  },
  observationBlock: {
    gap: 8,
  },
  observationLabel: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  observationInput: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    color: '#111',
    fontSize: 14,
    fontWeight: '700',
    minHeight: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  customizationFooter: {
    alignItems: 'center',
    borderTopColor: '#333',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  totalLabel: {
    color: Colors.textGray,
    fontSize: 12,
    fontWeight: '800',
  },
  totalValue: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  addCustomizedButton: {
    alignItems: 'center',
    backgroundColor: Colors.accentRed,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  addCustomizedButtonDisabled: {
    backgroundColor: '#585858',
    opacity: 0.55,
  },
  addCustomizedText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
});
