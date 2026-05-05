import { Colors } from '@/constants/Colors';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function CategoryItem({ label, iconUri }: { label: string, iconUri: string }) {
  return (
    <TouchableOpacity style={styles.container}>
      <View style={styles.iconBox}>
        <Image source={{ uri: iconUri }} style={styles.icon} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: 20,
  },
  iconBox: {
    width: 70,
    height: 70,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.accentRed,
    padding: 10,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  label: {
    color: Colors.white,
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});