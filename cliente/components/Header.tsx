import UserIcon from '@/assets/images/user.svg';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type HeaderProps = {
  hasActiveFilters: boolean;
  onOpenFilters: () => void;
  onSearchChange: (value: string) => void;
  searchTerm: string;
};

export function Header({
  hasActiveFilters,
  onOpenFilters,
  onSearchChange,
  searchTerm,
}: HeaderProps) {
  const { userName } = useAuth();

  return (
    <View style={styles.container}>
      {/* Linha 1: Perfil e Notificação */}
      <View style={styles.topRow}>
        <View style={styles.userProfile}>
          <View style={styles.avatarBorder}>
            <View style={styles.avatarPlaceholder}>
              <UserIcon width={24} height={24} color={Colors.white} fill={Colors.white} />
            </View>
          </View>
          <View>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userRole}>Bem-vindo!</Text>
          </View>
        </View>
        
        <TouchableOpacity accessibilityLabel="Notificações" style={styles.notificationBtn}>
          <Ionicons name="notifications" size={22} color={Colors.white} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      {/* Linha 2: Localização */}
      <View style={styles.locationRow}>
        <Feather name="navigation" size={16} color={Colors.white} />
        <Text style={styles.locationText}>Restaurante X, Sua Cidade</Text>
      </View>

      {/* Linha 3: Busca e Filtro */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#888" />
          <TextInput 
            placeholder="Buscar no cardápio" 
            placeholderTextColor="#888"
            value={searchTerm}
            onChangeText={onSearchChange}
            style={styles.input}
          />
        </View>
        <TouchableOpacity
          accessibilityLabel="Abrir filtros"
          activeOpacity={0.85}
          onPress={onOpenFilters}
          style={styles.filterBtn}
        >
          <Ionicons name="options-outline" size={24} color={Colors.cardOrange} />
          {hasActiveFilters && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBorder: {
    padding: 2,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.accentRed,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF4444', // Cor base do avatar da imagem
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRole: {
    color: Colors.textGray,
    fontSize: 14,
  },
  notificationBtn: {
    backgroundColor: Colors.accentRed,
    padding: 10,
    borderRadius: 12,
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.accentRed,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 15,
  },
  locationText: {
    color: Colors.textGray,
    fontSize: 14,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000',
  },
  filterBtn: {
    width: 55,
    height: 55,
    backgroundColor: Colors.white,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    right: 11,
    top: 11,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accentRed,
    borderColor: Colors.white,
    borderWidth: 1.5,
  },
});
