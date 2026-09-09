import { Colors } from '@/constants/Colors';
import { getFoodImage } from '@/utils/imageHelper';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FoodCardProps {
  name: string;
  category: string;
  image?: string;
  price: number;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

export function FoodCard({
  name,
  category,
  image,
  price,
  quantity,
  onAdd,
  onRemove,
}: FoodCardProps) {
  const foodSource = getFoodImage(name, image);
  const formattedPrice = price.toFixed(2).replace('.', ',');

  return (
    <View style={[styles.card, quantity > 0 && styles.selectedCard]}>
        <View style={styles.imageWrapper}>
          <Image source={foodSource} style={styles.image} resizeMode="cover" accessible={false} />
        </View>

        <View style={styles.content}>
          <Text style={styles.category} numberOfLines={1}>
            {category}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {name}
          </Text>

          <View style={styles.footer}>
            <Text style={styles.price}>
              <Text style={styles.currencySign}>R$ </Text>
              {formattedPrice}
            </Text>

            {quantity > 0 ? (
              <View style={styles.quantityControl}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Remover uma unidade de ${name}`}
                  activeOpacity={0.75}
                  onPress={onRemove}
                  style={styles.removeButton}
                >
                  <Feather name={quantity === 1 ? 'trash-2' : 'minus'} size={17} color="#D8A8A8" />
                </TouchableOpacity>

                <Text style={styles.quantity} accessibilityLabel={`${quantity} unidades de ${name} no carrinho`}>
                  {quantity}
                </Text>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Adicionar mais ${name}`}
                  activeOpacity={0.8}
                  onPress={onAdd}
                  style={styles.increaseButton}
                >
                  <Feather name="plus" size={20} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Adicionar ${name} ao pedido`}
                activeOpacity={0.8}
                onPress={onAdd}
                style={styles.addButton}
              >
                <Feather name="plus" size={17} color={Colors.white} />
                <Text style={styles.addButtonText}>Adicionar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 19,
    backgroundColor: '#222224',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#38383C',
  },
  selectedCard: {
    borderColor: '#765632',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1.15,
    backgroundColor: '#2D2D30',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 12,
    paddingTop: 13,
  },
  category: {
    fontSize: 10,
    color: '#B5A48E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    lineHeight: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F3F5',
    lineHeight: 22,
    minHeight: 44,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  footer: {
    marginTop: 'auto',
    gap: 12,
  },
  currencySign: {
    fontSize: 11,
    fontWeight: '400',
    color: '#ACACB6',
  },
  price: {
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 24,
    color: '#F3F3F5',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#19191B',
    borderRadius: 11,
    minHeight: 44,
  },
  removeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    minHeight: 44,
    borderRadius: 11,
  },
  increaseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C92525',
    borderRadius: 11,
    width: 44,
    minHeight: 44,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#C92525',
    borderRadius: 11,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  quantity: {
    flex: 1,
    fontWeight: '600',
    fontSize: 14,
    color: '#E3E3E9',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
