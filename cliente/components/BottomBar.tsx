import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type BottomBarProps = {
  totalItems: number;
  totalPrice: number;
};

export function BottomBar({ totalItems, totalPrice }: BottomBarProps) {
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [opacityAnim] = useState(() => new Animated.Value(1));
  const selectedItemsLabel = totalItems === 1
    ? '1 item selecionado'
    : `${totalItems} itens selecionados`;
  const formattedTotal = totalPrice.toFixed(2).replace('.', ',');

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [opacityAnim, scaleAnim, totalItems]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.infoContainer}>
        <Text style={styles.itemsCount}>
          {selectedItemsLabel}
        </Text>
        <Text style={styles.itemsDetails} />
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/cart')}
        style={styles.checkoutBtn}
      >
        <Text style={styles.priceText}>
          R$ {formattedTotal}
        </Text>
        <Feather name="chevron-right" size={24} color={Colors.white} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    height: 80,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  infoContainer: {
    flex: 1,
  },
  itemsCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  itemsDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  checkoutBtn: {
    backgroundColor: Colors.accentRed,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  priceText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
