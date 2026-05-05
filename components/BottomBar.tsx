import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function BottomBar() {
  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.itemsCount}>4 items selected</Text>
        <Text style={styles.itemsDetails}>Dish Fish and Juice Syrup</Text>
      </View>
      
      <TouchableOpacity style={styles.checkoutBtn}>
        <Text style={styles.priceText}>$123,45</Text>
        <Feather name="chevron-right" size={24} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20, // Distância do fundo
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    height: 80,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    // Sombra para dar o efeito de flutuação
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