import { restoreSelections } from '@/utils/cartEditing';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import type { SelectedOptionSnapshot, AddItemConfig } from '@/contexts/CartContext';
import type { MenuItemData } from '@/utils/menuItem';

function formatPrice(price: number) { return price.toFixed(2).replace('.', ','); }
function roundCurrency(value: number) { return Math.round(value * 100) / 100; }

export function ItemCustomizationModal({ item: customizingItem, initialOptions = [], initialObservation = '', editing = false, onClose: closeCustomizationModal, onSave }: {
  item: MenuItemData;
  initialOptions?: SelectedOptionSnapshot[];
  initialObservation?: string;
  editing?: boolean;
  onClose: () => void;
  onSave: (item: MenuItemData, config: AddItemConfig) => void;
}) {
  const [customizationObservation, setCustomizationObservation] = React.useState(initialObservation);
  const [singleSelections, setSingleSelections] = React.useState(() => restoreSelections(customizingItem.gruposOpcoes, initialOptions).single);
  const [multipleSelections, setMultipleSelections] = React.useState(() => restoreSelections(customizingItem.gruposOpcoes, initialOptions).multiple);
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

  const buildSelectedOptions = React.useCallback((item: MenuItemData): SelectedOptionSnapshot[] => {
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
  }, [singleSelections, multipleSelections]);

  const customizationTotal = React.useMemo(() => {
    if (!customizingItem) {
      return 0;
    }

    const optionsTotal = buildSelectedOptions(customizingItem).reduce((sum, option) => (
      sum + option.precoAdicional * option.quantidade
    ), 0);

    return roundCurrency(customizingItem.price + optionsTotal);
  }, [customizingItem, buildSelectedOptions]);

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

    onSave(customizingItem, {
      observacao: customizationObservation,
      opcoesSelecionadas: buildSelectedOptions(customizingItem),
      precoUnitarioFinal: customizationTotal,
    });
  }

  return (
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
                    {editing ? 'Editar item' : customizingItem.tipo === 'com_acompanhamento' ? 'Personalizar item' : 'Observação'}
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
                {editing && <Text style={styles.editNotice}>Revise as opções e o valor antes de salvar. Usamos o cardápio atual.</Text>}
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
                  <Text style={styles.addCustomizedText}>{editing ? 'Salvar alterações' : 'Adicionar ao carrinho'}</Text>
                  <Feather name={editing ? 'check' : 'shopping-cart'} size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
  );
}

const styles = StyleSheet.create({
  editNotice: { color: '#B8B8C2', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  customizationOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  customizationBackdrop: {
    ...StyleSheet.absoluteFill,
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
