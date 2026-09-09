import { Colors } from '@/constants/Colors';
import { CheckoutModal, PaymentMethod } from '@/components/CheckoutModal';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import type { CartItem } from '@/contexts/CartContext';
import { CheckoutPaymentMethod, createOrder } from '@/services/api';
import { getFoodImage } from '@/utils/imageHelper';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const CATEGORY_LABELS: Record<string, string> = {
  snack: 'Lanche',
  main: 'Prato principal',
  drink: 'Bebida',
  dessert: 'Sobremesa',
};

const CART_BACKGROUND = '#121212';

function formatPrice(price: number) {
  return price.toFixed(2).replace('.', ',');
}

function formatCartOption(option: CartItem['opcoesSelecionadas'][number]) {
  const quantityLabel = option.quantidade > 1 ? `${option.quantidade}x ` : '';

  return `${option.grupoNome}: ${quantityLabel}${option.opcaoNome}`;
}

function getCartItemOptionsSummary(item: CartItem) {
  return item.opcoesSelecionadas.map(formatCartOption).join(' · ');
}

export default function CartScreen() {
  const { tableNumber, userName } = useAuth();
  const {
    cartItems,
    clearCart,
    increaseItemQuantity,
    removeItem,
    totalItems,
    totalPrice,
  } = useCart();
  const [isCheckoutModalVisible, setIsCheckoutModalVisible] = React.useState(false);

  function resetCartPage() {
    setIsCheckoutModalVisible(false);
    clearCart();
  }

  function confirmClearCart() {
    if (Platform.OS === 'web') {
      const browserConfirm = (
        globalThis as typeof globalThis & { confirm?: (message?: string) => boolean }
      ).confirm;
      const shouldClear = browserConfirm
        ? browserConfirm('Limpar carrinho? Todos os itens selecionados serão removidos do pedido.')
        : true;

      if (shouldClear) {
        resetCartPage();
      }

      return;
    }

    Alert.alert(
      'Limpar carrinho?',
      'Todos os itens selecionados serão removidos do pedido.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar', style: 'destructive', onPress: resetCartPage },
      ]
    );
  }

  function handleCheckoutPress() {
    setIsCheckoutModalVisible(true);
  }

  async function handlePaymentConfirm(paymentMethod: PaymentMethod) {
    const paymentLabel = paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito/Débito';
    const apiPaymentMethod: CheckoutPaymentMethod = paymentMethod === 'pix' ? 'pix' : 'cartao';

    try {
      await createOrder({
        cartItems,
        customerName: userName,
        paymentMethod: apiPaymentMethod,
        tableNumber: tableNumber ?? 1,
        total: totalPrice,
      });
      resetCartPage();
      router.replace('/');
      console.log(`Pagamento simulado concluído com ${paymentLabel}. Pedido registrado no backend.`);
    } catch (error) {
      Alert.alert(
        'Pedido não registrado',
        'O pagamento simulado foi concluído, mas não foi possível salvar o pedido no backend. Verifique a API e tente novamente.',
      );
      throw error;
    }
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconBox}>
            <Feather name="shopping-bag" size={32} color="#D4D4DC" />
          </View>

          <Text style={styles.title}>Carrinho vazio</Text>
          <Text style={styles.description}>
            Escolha seus pratos favoritos no cardápio e acompanhe o total do pedido por aqui.
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.9}
            onPress={() => router.push('/')}
            style={styles.button}
          >
            <Feather name="arrow-left" size={20} color={Colors.white} />
            <Text style={styles.buttonText}>Voltar ao cardápio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={cartItems}
        keyExtractor={item => item.cartKey}
        style={styles.scrollArea}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Voltar ao cardápio"
              activeOpacity={0.8}
              onPress={() => router.push('/')}
              style={styles.backButton}
            >
              <Feather name="arrow-left" size={20} color={Colors.white} />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.cartTitle}>Carrinho</Text>
              <Text style={styles.cartSubtitle}>
                {totalItems === 1 ? '1 item selecionado' : `${totalItems} itens selecionados`}
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.8}
              hitSlop={10}
              onPress={confirmClearCart}
              style={styles.clearButton}
            >
              <Feather name="trash-2" size={16} color={Colors.textGray} />
              <Text style={styles.clearButtonText}>Limpar</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => {
          const unitPrice = item.precoUnitarioFinal;
          const subtotal = unitPrice * item.quantity;
          const hasMultipleUnits = item.quantity > 1;
          const canAdjustQuantity = item.tipo !== 'com_acompanhamento';
          const optionsSummary = getCartItemOptionsSummary(item);
          const hasDetails = Boolean(optionsSummary || item.observacao);

          return (
            <View style={styles.cartItem}>
              <View style={styles.itemTop}>
                <Image source={getFoodImage(item.name, item.image)} style={styles.itemImage} resizeMode="cover" />

                <View style={styles.itemInfo}>
                  <Text style={styles.itemCategory} numberOfLines={1}>
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </Text>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {hasMultipleUnits ? `${item.quantity} x R$ ${formatPrice(unitPrice)}` : `R$ ${formatPrice(unitPrice)}`}
                  </Text>
                </View>
              </View>
              {hasDetails && (
                <View style={styles.itemDetails}>
                  {!!optionsSummary && (
                    <Text style={styles.itemOptions}>
                      {optionsSummary}
                    </Text>
                  )}
                  {!!item.observacao && (
                    <Text style={styles.itemObservation}>
                      Obs: {item.observacao}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.itemActions}>
                <View style={styles.subtotalBlock}>
                  <Text style={styles.subtotalLabel}>Subtotal</Text>
                  <Text style={styles.subtotal}>R$ {formatPrice(subtotal)}</Text>
                </View>
                {canAdjustQuantity ? (
                  <View style={styles.quantityControl}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={item.quantity === 1 ? `Remover ${item.name}` : `Diminuir quantidade de ${item.name}`}
                      onPress={() => removeItem(item.cartKey)} style={styles.iconButton}>
                      <Feather
                        name={item.quantity === 1 ? 'trash-2' : 'minus'}
                        size={18}
                        color={Colors.white}
                      />
                    </TouchableOpacity>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Aumentar quantidade de ${item.name}`}
                      onPress={() => increaseItemQuantity(item.cartKey)} style={styles.iconButton}>
                      <Feather name="plus" size={18} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${item.name}`}
                    activeOpacity={0.86}
                    onPress={() => removeItem(item.cartKey)}
                    style={styles.removeCustomButton}
                  >
                    <Feather name="trash-2" size={18} color="#F08080" />
                    <Text style={styles.removeCustomText}>Remover</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>Total do pedido</Text>
            <Text style={styles.summaryItems}>
              {totalItems === 1 ? '1 produto' : `${totalItems} produtos`}
            </Text>
          </View>
          <Text style={styles.summaryTotal}>R$ {formatPrice(totalPrice)}</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.9}
          onPress={handleCheckoutPress}
          style={styles.checkoutButton}
        >
          <Text style={styles.checkoutButtonText}>Finalizar pedido</Text>
          <Feather name="arrow-right" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <CheckoutModal
        onClose={() => setIsCheckoutModalVisible(false)}
        onConfirm={handlePaymentConfirm}
        totalPrice={totalPrice}
        visible={isCheckoutModalVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CART_BACKGROUND },
  scrollArea: { flex: 1 },
  list: { padding: 20, paddingBottom: 8 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconBox: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#202023',
    borderWidth: 1, borderColor: '#323237', alignItems: 'center',
    justifyContent: 'center', marginBottom: 24,
  },
  title: { color: '#F5F5F7', fontSize: 26, fontWeight: '600', textAlign: 'center' },
  description: {
    color: '#A6A6B0', fontSize: 14, lineHeight: 22, marginTop: 10,
    maxWidth: 300, textAlign: 'center',
  },
  button: {
    minHeight: 50, borderRadius: 14, backgroundColor: '#C92525',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 28, paddingHorizontal: 22,
  },
  buttonText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  header: {
    alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 28, marginTop: 8,
  },
  backButton: {
    alignItems: 'center', backgroundColor: '#222225', borderColor: '#333338',
    borderRadius: 14, borderWidth: 1, height: 44, justifyContent: 'center', width: 44,
  },
  headerText: { flex: 1, minWidth: 0 },
  cartTitle: { color: '#F5F5F7', fontSize: 27, fontWeight: '600', letterSpacing: -0.6 },
  cartSubtitle: { color: '#A6A6B0', fontSize: 12, lineHeight: 18, marginTop: 3 },
  clearButton: {
    alignItems: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 4, minHeight: 44,
  },
  clearButtonText: { color: '#B8B8C2', fontSize: 12, fontWeight: '500' },
  cartItem: {
    backgroundColor: '#1E1E21', borderColor: '#323237', borderRadius: 18,
    borderWidth: 1, marginBottom: 12, padding: 14,
  },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  itemImage: { borderRadius: 12, height: 76, width: 76 },
  itemInfo: { flex: 1, minWidth: 0 },
  itemCategory: { color: '#A6A6B0', fontSize: 11, fontWeight: '500', marginBottom: 4 },
  itemName: { color: '#F5F5F7', fontSize: 16, fontWeight: '600', lineHeight: 22 },
  itemPrice: {
    color: '#B8B8C2', fontSize: 12, fontWeight: '400', marginTop: 5,
    fontVariant: ['tabular-nums'],
  },
  itemDetails: {
    gap: 5, marginTop: 14, padding: 12, backgroundColor: '#252528', borderRadius: 10,
  },
  itemOptions: { color: '#D4D4DC', fontSize: 12, fontWeight: '400', lineHeight: 19 },
  itemObservation: { color: '#A6A6B0', fontSize: 12, fontWeight: '400', lineHeight: 19 },
  itemActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, borderTopWidth: 1, borderTopColor: '#323237', marginTop: 14, paddingTop: 12,
  },
  quantityControl: {
    alignItems: 'center', backgroundColor: '#C92525', borderColor: '#DF3636',
    borderWidth: 1, borderRadius: 12, flexDirection: 'row',
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  quantity: {
    color: '#F5F5F7', fontSize: 14, fontWeight: '600', minWidth: 24,
    textAlign: 'center', fontVariant: ['tabular-nums'],
  },
  removeCustomButton: {
    alignItems: 'center', flexDirection: 'row', gap: 7,
    borderRadius: 12, minHeight: 44, paddingHorizontal: 10,
  },
  removeCustomText: { color: '#F08080', fontSize: 12, fontWeight: '500' },
  subtotal: { color: '#F5F5F7', fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  subtotalBlock: { flexShrink: 1, gap: 3 },
  subtotalLabel: { color: '#A6A6B0', fontSize: 11, fontWeight: '400' },
  summary: {
    backgroundColor: '#1E1E21', borderColor: '#323237', borderWidth: 1,
    borderRadius: 18, padding: 18, marginHorizontal: 20, marginTop: 8, marginBottom: 12,
  },
  summaryTop: {
    alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between',
    gap: 12, marginBottom: 18,
  },
  summaryLabel: { color: '#D4D4DC', fontSize: 13, fontWeight: '500' },
  summaryItems: { color: '#A6A6B0', fontSize: 11, fontWeight: '400', marginTop: 4 },
  summaryTotal: { color: '#F5F5F7', fontSize: 23, fontWeight: '600', fontVariant: ['tabular-nums'] },
  checkoutButton: {
    alignItems: 'center', backgroundColor: '#C92525', borderRadius: 12,
    flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 52,
  },
  checkoutButtonText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
});
