import { Colors } from '@/constants/Colors';
import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CategoryItemProps {
  label: string;
  iconSource: ImageSourcePropType;
  isSelected?: boolean;
  onPress?: () => void;
}

export function CategoryItem({
  label,
  iconSource,
  isSelected = false,
  onPress,
}: CategoryItemProps) {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[
        styles.iconBox, 
        { borderColor: isSelected ? Colors.accentRed : 'transparent' } 
      ]}>
        <Image 
          source={iconSource} 
          style={styles.icon} 
          resizeMode="cover" 
        />
      </View>
      <Text style={[
        styles.label, 
        { 
          fontWeight: isSelected ? 'bold' : '500',
          color: isSelected ? Colors.white : '#999' 
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: 20,
    width: 75, 
  },
  iconBox: {
    width: 70,
    height: 70,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: '#333',
    overflow: 'hidden', // Faz a imagem 256x256 ficar redondinha nos cantos
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  label: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
});