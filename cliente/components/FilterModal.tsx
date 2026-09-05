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

type PercentValue = `${number}%`;

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

const priceTrackByRange: Record<
  PriceRangeFilter,
  { end: PercentValue; right: PercentValue; start: PercentValue }
> = {
  all: { start: '0%', end: '100%', right: '0%' },
  under15: { start: '0%', end: '19%', right: '81%' },
  '15to30': { start: '19%', end: '38%', right: '62%' },
  '30to50': { start: '38%', end: '63%', right: '37%' },
  above50: { start: '63%', end: '100%', right: '0%' },
};

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

  React.useEffect(() => {
    if (visible) {
      setDraftFilters(filters);
    }
  }, [filters, visible]);

  const priceTrack = priceTrackByRange[draftFilters.priceRange];

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
                      activeOpacity={0.85}
                      key={category.id}
                      onPress={() => handleCategoryPress(category.id)}
                      style={[styles.chip, selected && styles.chipActive]}
                    >
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
              <View style={styles.priceTrack}>
                <View
                  style={[
                    styles.priceProgress,
                    { left: priceTrack.start, right: priceTrack.right },
                  ]}
                />
                <View style={[styles.priceKnob, { left: priceTrack.start }]} />
                <View style={[styles.priceKnob, { left: priceTrack.end }]} />
              </View>
              <View style={styles.priceLabels}>
                <Text style={styles.priceLabel}>R$ 0</Text>
                <Text style={styles.priceLabel}>R$ 80+</Text>
              </View>
              <View style={styles.chipGrid}>
                {priceRanges.map(range => {
                  const selected = draftFilters.priceRange === range.id;

                  return (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      activeOpacity={0.85}
                      key={range.id}
                      onPress={() => handlePricePress(range.id)}
                      style={[styles.chip, selected && styles.chipActive]}
                    >
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
                      accessibilityState={{ selected }}
                      activeOpacity={0.85}
                      key={option.id}
                      onPress={() => setDraftFilters(prev => ({ ...prev, sort: option.id }))}
                      style={[styles.optionRow, selected && styles.optionRowActive]}
                    >
                      <View style={[styles.optionIcon, selected && styles.optionIconActive]}>
                        <Ionicons
                          name={option.icon}
                          size={18}
                          color={selected ? Colors.cardOrange : Colors.textGray}
                        />
                      </View>
                      <Text style={styles.optionText}>{option.label}</Text>
                      <View style={[styles.radio, selected && styles.radioActive]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferências</Text>
              <View style={styles.preferenceRow}>
                <View>
                  <Text style={styles.preferenceTitle}>Disponível agora</Text>
                  <Text style={styles.preferenceDescription}>Mostrar itens prontos para pedido</Text>
                </View>
                <View style={styles.switchTrack}>
                  <View style={styles.switchThumb} />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity activeOpacity={0.8} onPress={handleClear} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Limpar</Text>
            </TouchableOpacity>
            <TouchableOpacity
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.64)',
  },
  sheet: {
    backgroundColor: '#1D1D1D',
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
    color: Colors.cardOrange,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.white,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 2,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#2B2B2B',
    borderColor: '#3A3A3A',
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  content: {
    paddingBottom: 16,
    paddingTop: 22,
  },
  section: {
    backgroundColor: '#242424',
    borderColor: '#333',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 14,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#191919',
    borderColor: '#343434',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: Colors.cardOrange,
    borderColor: Colors.cardOrange,
  },
  chipText: {
    color: Colors.textGray,
    fontSize: 13,
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#000',
  },
  priceTrack: {
    backgroundColor: '#3B3B3B',
    borderRadius: 999,
    height: 8,
    marginHorizontal: 4,
    marginTop: 2,
    position: 'relative',
  },
  priceProgress: {
    backgroundColor: Colors.cardOrange,
    borderRadius: 999,
    height: 8,
    position: 'absolute',
  },
  priceKnob: {
    backgroundColor: Colors.white,
    borderColor: Colors.cardOrange,
    borderRadius: 11,
    borderWidth: 4,
    height: 22,
    marginLeft: -11,
    position: 'absolute',
    top: -7,
    width: 22,
  },
  priceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 12,
  },
  priceLabel: {
    color: Colors.textGray,
    fontSize: 12,
    fontWeight: '800',
  },
  optionStack: {
    gap: 10,
  },
  optionRow: {
    alignItems: 'center',
    backgroundColor: '#191919',
    borderColor: '#343434',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  optionRowActive: {
    backgroundColor: '#231F18',
    borderColor: Colors.cardOrange,
  },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: '#2E2E2E',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  optionIconActive: {
    backgroundColor: '#332612',
  },
  optionText: {
    color: Colors.white,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  radio: {
    alignItems: 'center',
    borderColor: '#555',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioActive: {
    borderColor: Colors.cardOrange,
  },
  radioDot: {
    backgroundColor: Colors.cardOrange,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  preferenceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  preferenceTitle: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  preferenceDescription: {
    color: Colors.textGray,
    fontSize: 12,
    marginTop: 3,
  },
  switchTrack: {
    alignItems: 'flex-end',
    backgroundColor: Colors.cardOrange,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 4,
    width: 56,
  },
  switchThumb: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    height: 24,
    width: 24,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 24,
    paddingTop: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#2B2B2B',
    borderColor: '#3A3A3A',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
  },
  secondaryButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Colors.accentRed,
    borderRadius: 16,
    flex: 1.35,
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
});
