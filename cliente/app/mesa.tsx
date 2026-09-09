import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const MIN_TABLE_NUMBER = 1;
const MAX_TABLE_NUMBER = 99;

function clampTableNumber(value: number) {
  return Math.min(MAX_TABLE_NUMBER, Math.max(MIN_TABLE_NUMBER, value));
}

function formatTableNumber(value: number) {
  return String(value).padStart(2, '0');
}

export default function TableScreen() {
  const { isAuthenticated, setSessionTableNumber, tableNumber, userName } = useAuth();
  const [selectedTableNumber, setSelectedTableNumber] = React.useState(tableNumber ?? 1);

  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  function changeTableNumber(change: number) {
    setSelectedTableNumber(current => clampTableNumber(current + change));
  }

  function confirmTableNumber() {
    setSessionTableNumber(selectedTableNumber);
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="restaurant" size={26} color={Colors.cardOrange} />
          </View>
          <Text style={styles.kicker}>Olá, {userName}</Text>
          <Text style={styles.title}>Informe o número da sua mesa</Text>
          <Text style={styles.subtitle}>
            Essa informação ajuda a equipe a localizar seu pedido durante o atendimento.
          </Text>
        </View>

        <View style={styles.counterPanel}>
          <View style={styles.counterInput}>
            <Text accessibilityRole="text" style={styles.counterNumber}>
              {formatTableNumber(selectedTableNumber)}
            </Text>

            <View style={styles.counterControls}>
              <TouchableOpacity
                accessibilityLabel="Aumentar número da mesa"
                activeOpacity={0.82}
                disabled={selectedTableNumber >= MAX_TABLE_NUMBER}
                onPress={() => changeTableNumber(1)}
                style={[
                  styles.counterButton,
                  selectedTableNumber >= MAX_TABLE_NUMBER && styles.counterButtonDisabled,
                ]}
              >
                <Feather name="chevron-up" size={28} color={Colors.white} />
              </TouchableOpacity>

              <View style={styles.counterDivider} />

              <TouchableOpacity
                accessibilityLabel="Diminuir número da mesa"
                activeOpacity={0.82}
                disabled={selectedTableNumber <= MIN_TABLE_NUMBER}
                onPress={() => changeTableNumber(-1)}
                style={[
                  styles.counterButton,
                  selectedTableNumber <= MIN_TABLE_NUMBER && styles.counterButtonDisabled,
                ]}
              >
                <Feather name="chevron-down" size={28} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.helperRow}>
            <Feather name="map-pin" size={16} color={Colors.cardOrange} />
            <Text style={styles.helperText}>Mesa {formatTableNumber(selectedTableNumber)}</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={confirmTableNumber}
          style={styles.confirmShadow}
        >
          <LinearGradient
            colors={[Colors.accentRed, '#C90000']}
            style={styles.confirmButton}
          >
            <Text style={styles.confirmText}>Confirmar o número da mesa</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.background,
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 430,
    padding: 24,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: '#242424',
    borderColor: '#333',
    borderRadius: 22,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    marginBottom: 18,
    width: 64,
  },
  kicker: {
    color: Colors.cardOrange,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.white,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textGray,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 340,
    textAlign: 'center',
  },
  counterPanel: {
    backgroundColor: '#242424',
    borderColor: '#333',
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
  },
  counterInput: {
    alignItems: 'stretch',
    backgroundColor: '#111',
    borderColor: '#383838',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 132,
    overflow: 'hidden',
  },
  counterNumber: {
    color: Colors.white,
    flex: 1,
    fontSize: 68,
    fontWeight: '900',
    lineHeight: 132,
    textAlign: 'center',
  },
  counterControls: {
    backgroundColor: Colors.accentRed,
    width: 76,
  },
  counterButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  counterButtonDisabled: {
    opacity: 0.4,
  },
  counterDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    height: 1,
    marginHorizontal: 12,
  },
  helperRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
  },
  helperText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  confirmShadow: {
    borderRadius: 18,
    elevation: 8,
    marginTop: 24,
    shadowColor: Colors.accentRed,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  confirmButton: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 18,
  },
  confirmText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
});
