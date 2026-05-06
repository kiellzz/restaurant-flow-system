import { Colors } from '@/constants/Colors';
import { getFoodImage } from '@/utils/imageHelper';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FoodCardProps {
  name: string;
  category: string;
  price: number;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

export function FoodCard({
  name,
  category,
  price,
  quantity,
  onAdd,
  onRemove,
}: FoodCardProps) {
  const foodSource = getFoodImage(name);

  return (
    <View style={styles.shadowContainer}>
      <LinearGradient
        colors={[Colors.cardOrange, '#E67E22']}
        style={styles.card}
      >
        <View style={styles.imageWrapper}>
          <Image source={foodSource} style={styles.image} resizeMode="cover" />
        </View>

        <View style={styles.content}>
          <Text style={styles.category} numberOfLines={1}>
            {category}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {name}
          </Text>

          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,240,225,1)']}
            style={styles.footer}
          >
            <Text style={styles.price}>
              <Text style={styles.currencySign}>$</Text>
              {price.toFixed(2)}
            </Text>

            <View style={styles.actions}>
              {quantity > 0 && (
                <TouchableOpacity onPress={onRemove} style={styles.iconButton}>
                  <Feather name="minus-circle" size={22} color={Colors.accentRed} />
                </TouchableOpacity>
              )}

              {quantity > 0 && (
                <Text style={styles.quantity}>{quantity}</Text>
              )}

              <TouchableOpacity onPress={onAdd} style={styles.iconButton}>
                <Feather name="plus-circle" size={24} color={Colors.accentRed} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowContainer: {
    width: '48%',
    marginBottom: 20,
    borderRadius: 24,
    backgroundColor: 'transparent',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1.1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 14,
    paddingTop: 12,
  },
  category: {
    fontSize: 10,
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 4,
    opacity: 0.6,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  currencySign: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  price: {
    fontWeight: '900',
    fontSize: 16,
    color: '#000',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  iconButton: {
    padding: 2,
  },
  quantity: {
    fontWeight: '800',
    fontSize: 15,
    color: '#000',
    textAlign: 'center',
  },
});