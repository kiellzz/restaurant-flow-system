import { Colors } from '@/constants/Colors';
import { CheckoutModal, PaymentMethod } from '@/components/CheckoutModal';
import { useCart } from '@/contexts/CartContext';
import { getFoodImage } from '@/utils/imageHelper';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Alert,
  FlatList,
  Image,
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

export default function CartScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { addItem, cartItems, clearCart, removeItem, totalItems, totalPrice } = useCart();
  const [isCheckoutModalVisible, setIsCheckoutModalVisible] = React.useState(false);

  function confirmClearCart() {
    Alert.alert(
      'Limpar carrinho?',
      'Todos os itens selecionados serão removidos do pedido.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar', style: 'destructive', onPress: clearCart },
      ]
    );
  }

  function handleCheckoutPress() {
    setIsCheckoutModalVisible(true);
  }

  function handlePaymentConfirm(paymentMethod: PaymentMethod) {
    const paymentLabel = paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito/Débito';

    console.log(`Pagamento simulado concluído com ${paymentLabel}.`);
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconBox}>
            <Feather name="shopping-bag" size={36} color={Colors.cardOrange} />
          </View>

          <Text style={styles.title}>Carrinho vazio</Text>
          <Text style={styles.description}>
            Escolha seus pratos favoritos no cardápio e acompanhe o total do pedido por aqui.
          </Text>

          <TouchableOpacity
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
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 188 }]}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/')}
              style={styles.backButton}
            >
              <Feather name="arrow-left" size={20} color={Colors.white} />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>Seu pedido</Text>
              <Text style={styles.cartTitle}>Carrinho</Text>
              <Text style={styles.cartSubtitle}>
                {totalItems === 1 ? '1 item selecionado' : `${totalItems} itens selecionados`}
              </Text>
            </View>

            <TouchableOpacity activeOpacity={0.8} onPress={confirmClearCart} style={styles.clearButton}>
              <Feather name="trash-2" size={16} color={Colors.textGray} />
              <Text style={styles.clearButtonText}>Limpar</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => {
          const subtotal = item.price * item.quantity;
          const hasMultipleUnits = item.quantity > 1;

          return (
            <View style={styles.cartItem}>
              <Image source={getFoodImage(item.name)} style={styles.itemImage} resizeMode="cover" />

              <View style={styles.itemInfo}>
                <Text style={styles.itemCategory} numberOfLines={1}>
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </Text>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.itemPrice}>
                  {hasMultipleUnits ? `${item.quantity} x R$ ${formatPrice(item.price)}` : `R$ ${formatPrice(item.price)}`}
                </Text>
              </View>

              <View style={styles.itemActions}>
                <View style={styles.quantityControl}>
                  <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.iconButton}>
                    <Feather
                      name={item.quantity === 1 ? 'trash-2' : 'minus-circle'}
                      size={item.quantity === 1 ? 20 : 22}
                      color={Colors.accentRed}
                    />
                  </TouchableOpacity>
                  <Text style={styles.quantity}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => addItem(item)} style={styles.iconButton}>
                    <Feather name="plus-circle" size={22} color={Colors.accentRed} />
                  </TouchableOpacity>
                </View>

                <View style={styles.subtotalBlock}>
                  {hasMultipleUnits && <Text style={styles.subtotalLabel}>Subtotal</Text>}
                  <Text style={[styles.subtotal, hasMultipleUnits && styles.subtotalStrong]}>
                    R$ {formatPrice(subtotal)}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.summary, { bottom: tabBarHeight + 16 }]}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryItems}>
              {totalItems === 1 ? '1 produto' : `${totalItems} produtos`}
            </Text>
          </View>
          <Text style={styles.summaryTotal}>R$ {formatPrice(totalPrice)}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleCheckoutPress}
          style={styles.checkoutButton}
        >
          <Text style={styles.checkoutButtonText}>Finalizar Pedido</Text>
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
  container: {
    flex: 1,
    backgroundColor: CART_BACKGROUND,
  },
  list: {
    padding: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconBox: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: Colors.white,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    color: Colors.textGray,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    maxWidth: 340,
    textAlign: 'center',
  },
  button: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: Colors.accentRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 28,
    paddingHorizontal: 22,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
    marginTop: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#242424',
    borderColor: '#333',
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.cardOrange,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  cartTitle: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 2,
  },
  cartSubtitle: {
    color: Colors.textGray,
    fontSize: 14,
    marginTop: 2,
  },
  clearButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  clearButtonText: {
    color: Colors.textGray,
    fontSize: 13,
    fontWeight: '700',
  },
  cartItem: {
    alignItems: 'center',
    backgroundColor: '#242424',
    borderColor: '#333',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    padding: 12,
  },
  itemImage: {
    borderRadius: 16,
    height: 78,
    width: 78,
  },
  itemInfo: {
    flex: 1,
  },
  itemCategory: {
    color: Colors.cardOrange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  itemName: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  itemPrice: {
    color: Colors.textGray,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  itemActions: {
    alignItems: 'flex-end',
    gap: 10,
  },
  quantityControl: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  iconButton: {
    padding: 2,
  },
  quantity: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    minWidth: 24,
    textAlign: 'center',
  },
  subtotal: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  subtotalBlock: {
    alignItems: 'flex-end',
  },
  subtotalLabel: {
    color: Colors.cardOrange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  subtotalStrong: {
    color: Colors.accentRed,
    fontSize: 18,
  },
  summary: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    elevation: 14,
    left: 20,
    padding: 20,
    position: 'absolute',
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  summaryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryLabel: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  summaryItems: {
    color: '#666',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  summaryTotal: {
    color: Colors.accentRed,
    fontSize: 22,
    fontWeight: '900',
  },
  checkoutButton: {
    alignItems: 'center',
    backgroundColor: Colors.accentRed,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 54,
  },
  checkoutButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
});
