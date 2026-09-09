import { CustomerOrdersModal, isCustomerOrderActive } from '@/components/CustomerOrdersModal';
import UserIcon from '@/assets/images/user.svg';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import {
  ApiDeliveryConfirmation,
  ApiOrder,
  fetchOrders,
  subscribeToRealtimeEvents,
  updateDeliveryConfirmation,
} from '@/services/api';
import { Feather, Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type HeaderProps = {
  hasActiveFilters: boolean;
  onOpenFilters: () => void;
  onSearchChange: (value: string) => void;
  searchTerm: string;
};

const MIN_TABLE_NUMBER = 1;
const MAX_TABLE_NUMBER = 99;
const TABLE_CHANGE_COOLDOWN_MS = 5 * 60 * 1000;

function clampTableNumber(value: number) {
  return Math.min(MAX_TABLE_NUMBER, Math.max(MIN_TABLE_NUMBER, value));
}

function formatTableNumber(value: number) {
  return String(value).padStart(2, '0');
}

function formatCooldownRemaining(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return seconds > 0 ? `${minutes}min ${seconds}s` : `${minutes}min`;
}

function normalizeCustomerName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function Header({
  hasActiveFilters,
  onOpenFilters,
  onSearchChange,
  searchTerm,
}: HeaderProps) {
  const { lastTableChangeAt, setSessionTableNumber, tableNumber, userName } = useAuth();
  const [isOrdersModalVisible, setIsOrdersModalVisible] = React.useState(false);
  const [isTableModalVisible, setIsTableModalVisible] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const [selectedTableNumber, setSelectedTableNumber] = React.useState(tableNumber ?? 1);
  const [isLoadingOrders, setIsLoadingOrders] = React.useState(false);
  const [orders, setOrders] = React.useState<ApiOrder[]>([]);
  const [ordersError, setOrdersError] = React.useState('');
  const [busyDeliveryConfirmationIds, setBusyDeliveryConfirmationIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  const customerOrders = React.useMemo(() => {
    const normalizedUserName = normalizeCustomerName(userName);

    return orders
      .filter(order => normalizeCustomerName(order.cliente?.nome ?? '') === normalizedUserName)
      .sort((first, second) => (
        new Date(second.criadoEm).getTime() - new Date(first.criadoEm).getTime()
      ));
  }, [orders, userName]);

  const activeOrderCount = React.useMemo(
    () => customerOrders.filter(isCustomerOrderActive).length,
    [customerOrders],
  );
  const tableCooldownRemaining = lastTableChangeAt
    ? Math.max(0, lastTableChangeAt + TABLE_CHANGE_COOLDOWN_MS - now)
    : 0;
  const isTableChangeOnCooldown = tableCooldownRemaining > 0;

  const loadCustomerOrders = React.useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setIsLoadingOrders(true);
    }

    try {
      const apiOrders = await fetchOrders();
      setOrders(apiOrders);
      setOrdersError('');
    } catch (error) {
      if (!silent) {
        console.error(error);
      }

      setOrdersError('Não foi possível carregar seus pedidos.');
    } finally {
      if (!silent) {
        setIsLoadingOrders(false);
      }
    }
  }, []);

  React.useEffect(() => {
    loadCustomerOrders({ silent: true });

    const unsubscribe = subscribeToRealtimeEvents(event => {
      if (event.type === 'orders:changed' || event.type === 'demo:reset' || event.type === 'connection:open') {
        loadCustomerOrders({ silent: true });
      }
    });

    return unsubscribe;
  }, [loadCustomerOrders]);

  React.useEffect(() => {
    if (!isTableModalVisible || !isTableChangeOnCooldown) {
      return undefined;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [isTableChangeOnCooldown, isTableModalVisible]);

  function handleOpenOrders() {
    setIsOrdersModalVisible(true);
    loadCustomerOrders();
  }

  function handleOpenTableModal() {
    setNow(Date.now());
    setSelectedTableNumber(tableNumber ?? 1);
    setIsTableModalVisible(true);
  }

  function changeSelectedTableNumber(change: number) {
    if (isTableChangeOnCooldown) {
      return;
    }

    setSelectedTableNumber(current => clampTableNumber(current + change));
  }

  function handleConfirmTableNumber() {
    if (isTableChangeOnCooldown) {
      return;
    }

    if (selectedTableNumber !== tableNumber) {
      setSessionTableNumber(selectedTableNumber, { startCooldown: true });
    }

    setIsTableModalVisible(false);
  }

  async function handleDeliveryConfirmation(
    orderId: string,
    confirmacaoEntrega: ApiDeliveryConfirmation,
  ) {
    setBusyDeliveryConfirmationIds(currentIds => new Set(currentIds).add(orderId));

    try {
      const updatedOrder = await updateDeliveryConfirmation(orderId, confirmacaoEntrega);
      setOrders(currentOrders => currentOrders.map(order => (
        order._id === orderId ? updatedOrder : order
      )));
      setOrdersError('');
    } catch (error) {
      console.error(error);
      setOrdersError('Não foi possível registrar a confirmação da entrega.');
    } finally {
      setBusyDeliveryConfirmationIds(currentIds => {
        const nextIds = new Set(currentIds);
        nextIds.delete(orderId);
        return nextIds;
      });
    }
  }

  function renderTableModal() {
    return (
      <Modal
        animationType="fade"
        onRequestClose={() => setIsTableModalVisible(false)}
        transparent
        visible={isTableModalVisible}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityLabel="Fechar alteração de mesa"
            onPress={() => setIsTableModalVisible(false)}
            style={styles.modalBackdrop}
          />

          <View style={styles.tableSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Sua mesa</Text>
                <Text style={styles.modalTitle}>Alterar mesa</Text>
              </View>

              <TouchableOpacity
                accessibilityLabel="Fechar alteração de mesa"
                activeOpacity={0.8}
                onPress={() => setIsTableModalVisible(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <Text style={styles.tableModalText}>
              {isTableChangeOnCooldown
                ? `Você poderá alterar a mesa novamente em ${formatCooldownRemaining(tableCooldownRemaining)}.`
                : 'Informe o número da sua mesa.'}
            </Text>

            <View style={styles.tableCounterPanel}>
              <View style={styles.tableCounterInput}>
                <Text accessibilityRole="text" style={styles.tableCounterNumber}>
                  {formatTableNumber(selectedTableNumber)}
                </Text>

                <View style={styles.tableCounterControls}>
                  <TouchableOpacity
                    accessibilityLabel="Aumentar número da mesa"
                    activeOpacity={0.82}
                    disabled={isTableChangeOnCooldown || selectedTableNumber >= MAX_TABLE_NUMBER}
                    onPress={() => changeSelectedTableNumber(1)}
                    style={[
                      styles.tableCounterButton,
                      (isTableChangeOnCooldown || selectedTableNumber >= MAX_TABLE_NUMBER) &&
                        styles.tableCounterButtonDisabled,
                    ]}
                  >
                    <Feather name="chevron-up" size={28} color={Colors.white} />
                  </TouchableOpacity>

                  <View style={styles.tableCounterDivider} />

                  <TouchableOpacity
                    accessibilityLabel="Diminuir número da mesa"
                    activeOpacity={0.82}
                    disabled={isTableChangeOnCooldown || selectedTableNumber <= MIN_TABLE_NUMBER}
                    onPress={() => changeSelectedTableNumber(-1)}
                    style={[
                      styles.tableCounterButton,
                      (isTableChangeOnCooldown || selectedTableNumber <= MIN_TABLE_NUMBER) &&
                        styles.tableCounterButtonDisabled,
                    ]}
                  >
                    <Feather name="chevron-down" size={28} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={isTableChangeOnCooldown}
              onPress={handleConfirmTableNumber}
              style={[
                styles.tableConfirmButton,
                isTableChangeOnCooldown && styles.tableConfirmButtonDisabled,
              ]}
            >
              <Text style={styles.tableConfirmButtonText}>Confirmar mesa</Text>
              <Feather name="check" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
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

        <TouchableOpacity
          accessibilityLabel={`Pedidos do cliente. ${activeOrderCount} pedidos ativos.`}
          accessibilityRole="button"
          activeOpacity={0.86}
          onPress={handleOpenOrders}
          style={styles.notificationBtn}
        >
          <Ionicons name="notifications" size={22} color={Colors.white} />
          {activeOrderCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {activeOrderCount > 9 ? '9+' : activeOrderCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        accessibilityLabel="Alterar número da mesa"
        accessibilityRole="button"
        activeOpacity={0.78}
        onPress={handleOpenTableModal}
        style={styles.locationRow}
      >
        <Feather name="navigation" size={16} color={Colors.white} />
        <Text style={styles.locationText}>
          Restaurante X, Sua Cidade
          {tableNumber ? ` · Mesa ${formatTableNumber(tableNumber)}` : ''}
        </Text>
        <Feather name="edit-2" size={13} color={Colors.cardOrange} />
      </TouchableOpacity>

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

      <CustomerOrdersModal
        visible={isOrdersModalVisible}
        orders={customerOrders}
        loading={isLoadingOrders}
        error={ordersError}
        busyOrderIds={busyDeliveryConfirmationIds}
        onClose={() => setIsOrdersModalVisible(false)}
        onRetry={() => loadCustomerOrders()}
        onConfirm={handleDeliveryConfirmation}
      />
      {renderTableModal()}
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
    flex: 1,
    minWidth: 0,
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
    backgroundColor: '#FF4444',
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    width: 48,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.accentRed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: Colors.accentRed,
    fontSize: 10,
    fontWeight: '900',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginTop: 15,
    paddingVertical: 4,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 64,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  tableSheet: {
    alignSelf: 'center',
    backgroundColor: '#121212',
    borderColor: '#292929',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  modalEyebrow: {
    color: Colors.cardOrange,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#242424',
    borderColor: '#333',
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  tableModalText: {
    color: Colors.textGray,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 14,
  },
  tableCounterPanel: {
    backgroundColor: '#202020',
    borderColor: '#333',
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
  },
  tableCounterInput: {
    alignItems: 'stretch',
    backgroundColor: '#111',
    borderColor: '#383838',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 118,
    overflow: 'hidden',
  },
  tableCounterNumber: {
    color: Colors.white,
    flex: 1,
    fontSize: 60,
    fontWeight: '900',
    lineHeight: 118,
    textAlign: 'center',
  },
  tableCounterControls: {
    backgroundColor: Colors.accentRed,
    width: 70,
  },
  tableCounterButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  tableCounterButtonDisabled: {
    opacity: 0.4,
  },
  tableCounterDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    height: 1,
    marginHorizontal: 12,
  },
  tableConfirmButton: {
    alignItems: 'center',
    backgroundColor: Colors.accentRed,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 54,
  },
  tableConfirmButtonDisabled: {
    opacity: 0.45,
  },
  tableConfirmButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '900',
  },

});
