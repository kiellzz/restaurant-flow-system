import { Colors } from '@/constants/Colors';
import { Feather, Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type MenuCategoryFilter = 'snack' | 'main' | 'drink' | 'dessert';
export type PriceRangeFilter = 'all' | 'under15' | '15to30' | '30to50' | 'above50';
export type SortFilter = 'popular' | 'priceAsc' | 'priceDesc' | 'newest';

export type MenuFilters = {
  category: MenuCategoryFilter | null;
  priceRange: PriceRangeFilter;
  sort: SortFilter;
};

export const DEFAULT_MENU_FILTERS: MenuFilters = {
  category: null,
  priceRange: 'all',
  sort: 'popular',
};

type FilterModalProps = {
  filters: MenuFilters;
  visible: boolean;
  onApply: (filters: MenuFilters) => void;
  onClear: () => void;
  onClose: () => void;
};

const categories: { id: MenuCategoryFilter; label: string }[] = [
  { id: 'snack', label: 'Lanches' },
  { id: 'main', label: 'Pratos principais' },
  { id: 'drink', label: 'Bebidas' },
  { id: 'dessert', label: 'Sobremesas' },
];

const priceRanges: { id: PriceRangeFilter; label: string }[] = [
  { id: 'all', label: 'Qualquer preço' },
  { id: 'under15', label: 'Até R$ 15' },
  { id: '15to30', label: 'R$ 15 - R$ 30' },
  { id: '30to50', label: 'R$ 30 - R$ 50' },
  { id: 'above50', label: 'Acima de R$ 50' },
];

const sortOptions: {
  id: SortFilter;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { id: 'popular', icon: 'flame-outline', label: 'Mais pedidos' },
  { id: 'priceAsc', icon: 'arrow-down-outline', label: 'Menor preço' },
  { id: 'priceDesc', icon: 'arrow-up-outline', label: 'Maior preço' },
  { id: 'newest', icon: 'sparkles-outline', label: 'Novidades' },
];

export function hasFunctionalFilters(filters: MenuFilters) {
  return Boolean(
    filters.category ||
    filters.priceRange !== 'all' ||
    filters.sort === 'priceAsc' ||
    filters.sort === 'priceDesc'
  );
}

export function FilterModal({
  filters,
  visible,
  onApply,
  onClear,
  onClose,
}: FilterModalProps) {
  const [draftFilters, setDraftFilters] = React.useState<MenuFilters>(filters);

  function handleCategoryPress(category: MenuCategoryFilter) {
    setDraftFilters(prev => ({
      ...prev,
      category: prev.category === category ? null : category,
    }));
  }

  function handlePricePress(priceRange: PriceRangeFilter) {
    setDraftFilters(prev => ({
      ...prev,
      priceRange: prev.priceRange === priceRange ? 'all' : priceRange,
    }));
  }

  function handleClear() {
    setDraftFilters(DEFAULT_MENU_FILTERS);
    onClear();
  }

  return (
    <Modal
      animationType="fade"
      onShow={() => setDraftFilters(filters)}
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Refinar busca</Text>
              <Text style={styles.title}>Filtros</Text>
            </View>

            <TouchableOpacity
              accessibilityLabel="Fechar filtros"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Feather name="x" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categorias</Text>
              <View style={styles.chipGrid}>
                {categories.map(category => {
                  const selected = draftFilters.category === category.id;

                  return (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      aria-pressed={selected}
                      activeOpacity={0.85}
                      key={category.id}
                      onPress={() => handleCategoryPress(category.id)}
                      style={[styles.chip, selected && styles.chipActive]}
                    >
                      {selected && <Feather name="check" size={13} color="#F0F0F3" />}
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Faixa de preço</Text>
              <View style={styles.chipGrid}>
                {priceRanges.map(range => {
                  const selected = draftFilters.priceRange === range.id;

                  return (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      aria-pressed={selected}
                      activeOpacity={0.85}
                      key={range.id}
                      onPress={() => handlePricePress(range.id)}
                      style={[styles.chip, selected && styles.chipActive]}
                    >
                      {selected && <Feather name="check" size={13} color="#F0F0F3" />}
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {range.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ordenar por</Text>
              <View style={styles.optionStack}>
                {sortOptions.map(option => {
                  const selected = draftFilters.sort === option.id;

                  return (
                    <TouchableOpacity
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      aria-checked={selected}
                      activeOpacity={0.85}
                      key={option.id}
                      onPress={() => setDraftFilters(prev => ({ ...prev, sort: option.id }))}
                      style={[styles.optionRow, selected && styles.optionRowActive]}
                    >
                      <View style={[styles.optionIcon, selected && styles.optionIconActive]}>
                        <Ionicons
                          name={option.icon}
                          size={18}
                          color={selected ? '#F0F0F3' : '#92929D'}
                        />
                      </View>
                      <Text style={[styles.optionText, selected && styles.optionTextActive]}>{option.label}</Text>
                      <View style={[styles.radio, selected && styles.radioActive]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.availabilityNote}>
              <Feather name="check-circle" size={15} color="#9CB9A8" />
              <Text style={styles.availabilityText}>O cardápio mostra apenas itens disponíveis para pedir.</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} onPress={handleClear} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Limpar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              onPress={() => onApply(draftFilters)}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Ver resultados</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.64)',
  },
  sheet: {
    backgroundColor: '#19191C',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    borderColor: '#303034',
    borderWidth: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#4A4A4A',
    borderRadius: 10,
    height: 5,
    marginBottom: 18,
    width: 46,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#9696A2',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.white,
    fontSize: 27,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginTop: 5,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#252529',
    borderColor: '#343439',
    borderRadius: 13,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  content: {
    paddingBottom: 20,
    paddingTop: 8,
  },
  section: {
    borderBottomColor: '#303034',
    borderBottomWidth: 1,
    paddingVertical: 20,
  },
  sectionTitle: {
    color: '#E6E6EB',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 14,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    backgroundColor: '#222225',
    borderColor: '#36363C',
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: '#C92525',
    borderColor: '#DE4545',
  },
  chipText: {
    color: '#B2B2BC',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  chipTextActive: {
    color: '#F0F0F3',
    fontWeight: '600',
  },
  optionStack: {
    gap: 6,
  },
  optionRow: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    padding: 10,
  },
  optionRowActive: {
    backgroundColor: '#3A2023',
    borderColor: '#C92525',
  },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: '#252529',
    borderRadius: 9,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  optionIconActive: {
    backgroundColor: '#7A282D',
  },
  optionText: {
    color: '#B2B2BC',
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
  },
  optionTextActive: {
    color: '#F0F0F3',
    fontWeight: '600',
  },
  radio: {
    alignItems: 'center',
    borderColor: '#555',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioActive: {
    borderColor: '#F06464',
  },
  radioDot: {
    backgroundColor: '#F06464',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  footer: {
    borderTopColor: '#303034',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 24,
    paddingTop: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#242428',
    borderColor: '#3A3A42',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
    padding: 10,
  },
  secondaryButtonText: {
    color: '#C3C3CC',
    fontSize: 13,
    fontWeight: '500',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#C92525',
    borderRadius: 12,
    flex: 1.35,
    justifyContent: 'center',
    minHeight: 50,
    padding: 10,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  availabilityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingTop: 18,
  },
  availabilityText: {
    flex: 1,
    color: '#9696A2',
    fontSize: 11,
    lineHeight: 18,
  },
});
