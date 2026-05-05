import { Colors } from '@/constants/Colors';
import { getFoodImage } from '@/utils/imageHelper';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FoodCardProps {
  name: string;
  category: string;
  price: string;
}

export function FoodCard({ name, category, price }: FoodCardProps) {
  // O helper já retorna o require() correto baseado no nome
  const foodSource = getFoodImage(name);

  return (
    <View style={styles.card}>
      {/* Agora usamos source={foodSource} diretamente (sem o uri) */}
      <Image source={foodSource} style={styles.image} resizeMode="cover" />
      
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.category}>{category}</Text>
      
      <View style={styles.footer}>
        <Text style={styles.price}>{price}</Text>
        <TouchableOpacity>
          <Feather name="plus-circle" size={24} color={Colors.accentRed} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardOrange,
    borderRadius: 20,
    padding: 12,
    width: '48%', 
    marginBottom: 16,
    // Adicionei uma leve sombra para dar profundidade (opcional)
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 100,
    borderRadius: 15,
    backgroundColor: '#333',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 8,
  },
  category: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.lightOrange,
    padding: 8,
    borderRadius: 12,
  },
  price: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});