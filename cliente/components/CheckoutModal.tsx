import PixIcon from '@/assets/images/pix.svg';
import QrCodeExample from '@/assets/images/qrcode_example.webp';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export type PaymentMethod = 'pix' | 'card';
type CheckoutStep = 'selecting' | 'processing' | 'success';

type CheckoutModalProps = {
  onClose: () => void;
  onConfirm: (paymentMethod: PaymentMethod) => void;
  totalPrice: number;
  visible: boolean;
};

type PaymentOption = {
  description: string;
  id: PaymentMethod;
  label: string;
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    description: 'Aprovação instantânea',
    id: 'pix',
    label: 'PIX',
  },
  {
    description: 'Parcelamento disponível',
    id: 'card',
    label: 'Cartão de Crédito/Débito',
  },
];

const EMPTY_CARD_FORM = {
  cardNumber: '',
  cvv: '',
  expiry: '',
  holderName: '',
};

const DEMO_CARD_FORM = {
  cardNumber: '4111 1111 1111 1111',
  cvv: '123',
  expiry: '12/28',
  holderName: 'CLIENTE DEMO',
};

const PIX_PROCESSING_DELAY_MS = 4500;
const CARD_AUTOFILL_DELAY_MS = 1500;
const CARD_PROCESSING_DELAY_MS = 4500;
const PIX_COPY_PASTE_CODE =
  '00020126580014BR.GOV.BCB.PIX0136fake-chave-pix-simulacao5204000053039865802BR5913Restaurante X6008Sua Cidade62070503***6304ABCD';
const PIX_COPY_PASTE_PREVIEW = `${PIX_COPY_PASTE_CODE.slice(0, 32)}...`;

function PaymentIcon({ color, method }: { color: string; method: PaymentMethod }) {
  if (method === 'pix') {
    return <PixIcon width={30} height={30} fill={color} />;
  }

  return <Feather name="credit-card" size={30} color={color} />;
}

function formatPrice(price: number) {
  return price.toFixed(2).replace('.', ',');
}

export function CheckoutModal({
  onClose,
  onConfirm,
  totalPrice,
  visible,
}: CheckoutModalProps) {
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [step, setStep] = useState<CheckoutStep>('selecting');
  const [cardForm, setCardForm] = useState(EMPTY_CARD_FORM);
  const [isPixCodeCopied, setIsPixCodeCopied] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const simulationTimers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearSimulationTimers = React.useCallback(() => {
    simulationTimers.current.forEach(timer => clearTimeout(timer));
    simulationTimers.current = [];
  }, []);

  const resetFlow = React.useCallback(() => {
    clearSimulationTimers();
    setSelectedPayment(null);
    setStep('selecting');
    setCardForm(EMPTY_CARD_FORM);
    setIsPixCodeCopied(false);
    setIsProcessingPayment(false);
  }, [clearSimulationTimers]);

  const queueSimulationStep = React.useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      simulationTimers.current = simulationTimers.current.filter(item => item !== timer);
      callback();
    }, delay);

    simulationTimers.current.push(timer);
  }, []);

  React.useEffect(() => () => clearSimulationTimers(), [clearSimulationTimers]);

  React.useEffect(() => {
    if (!visible) {
      resetFlow();
    }
  }, [resetFlow, visible]);

  const amountLabel = `R$ ${formatPrice(totalPrice)}`;

  const handleConfirm = () => {
    if (!selectedPayment) return;

    setStep('processing');
    setIsProcessingPayment(true);
    setCardForm(EMPTY_CARD_FORM);
    setIsPixCodeCopied(false);

    // TODO: substituir simulação por integração real com backend de pagamento.
    if (selectedPayment === 'pix') {
      queueSimulationStep(() => {
        setIsProcessingPayment(false);
        setStep('success');
      }, PIX_PROCESSING_DELAY_MS);
      return;
    }

    queueSimulationStep(() => {
      setCardForm(DEMO_CARD_FORM);
    }, CARD_AUTOFILL_DELAY_MS);

    queueSimulationStep(() => {
      setIsProcessingPayment(false);
      setStep('success');
    }, CARD_PROCESSING_DELAY_MS);
  };

  const handleClose = () => {
    resetFlow();
    onClose();
  };

  const handleFinish = () => {
    if (selectedPayment) {
      onConfirm(selectedPayment);
    }

    handleClose();
  };

  const handleCopyPixCode = async () => {
    await Clipboard.setStringAsync(PIX_COPY_PASTE_CODE);
    setIsPixCodeCopied(true);
    queueSimulationStep(() => setIsPixCodeCopied(false), 2000);
  };

  function renderSimulationNotice() {
    return (
      <View style={styles.simulationNotice}>
        <Feather name="info" size={15} color={Colors.cardOrange} />
        <Text style={styles.simulationNoticeText}>
          Isso é uma simulação do produto final. Nenhum dado real ou pagamento será processado nesta versão de teste.
        </Text>
      </View>
    );
  }

  function renderProcessingContent() {
    if (selectedPayment === 'pix') {
      return (
        <View style={styles.processingContent}>
          <View style={styles.qrCard}>
            <Image source={QrCodeExample} resizeMode="contain" style={styles.qrCode} />
          </View>

          <Text style={styles.processingTitle}>Escaneie o QR Code para pagar</Text>
          <Text style={styles.amountText}>{amountLabel}</Text>

          <View style={styles.pixCodeBlock}>
            <Text style={styles.pixCodeLabel}>PIX copia e cola</Text>
            <TouchableOpacity
              accessibilityLabel={isPixCodeCopied ? 'Código PIX copiado' : 'Copiar código PIX'}
              accessibilityRole="button"
              activeOpacity={0.86}
              onPress={handleCopyPixCode}
              style={[
                styles.pixCodeRow,
                isPixCodeCopied && styles.pixCodeRowCopied,
              ]}
            >
              <Text
                ellipsizeMode="tail"
                numberOfLines={1}
                style={styles.pixCodePreview}
              >
                {PIX_COPY_PASTE_PREVIEW}
              </Text>
              <Feather
                name={isPixCodeCopied ? 'check' : 'copy'}
                size={18}
                color={isPixCodeCopied ? Colors.white : Colors.cardOrange}
              />
            </TouchableOpacity>
            {isPixCodeCopied && <Text style={styles.pixCopiedText}>Copiado!</Text>}
          </View>

          {renderSimulationNotice()}

          {isProcessingPayment && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.cardOrange} />
              <Text style={styles.loadingText}>Aguardando confirmação do pagamento...</Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.processingContent}>
        <View style={styles.cardForm}>
          <View style={styles.cardInputGroup}>
            <Text style={styles.cardInputLabel}>Número do cartão</Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={cardNumber => setCardForm(prev => ({ ...prev, cardNumber }))}
              placeholder="0000 0000 0000 0000"
              placeholderTextColor="#7A7A7A"
              style={styles.cardInput}
              value={cardForm.cardNumber}
            />
          </View>

          <View style={styles.cardInputRow}>
            <View style={styles.cardInputHalf}>
              <Text style={styles.cardInputLabel}>Validade</Text>
              <TextInput
                onChangeText={expiry => setCardForm(prev => ({ ...prev, expiry }))}
                placeholder="MM/AA"
                placeholderTextColor="#7A7A7A"
                style={styles.cardInput}
                value={cardForm.expiry}
              />
            </View>

            <View style={styles.cardInputHalf}>
              <Text style={styles.cardInputLabel}>CVV</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={cvv => setCardForm(prev => ({ ...prev, cvv }))}
                placeholder="000"
                placeholderTextColor="#7A7A7A"
                style={styles.cardInput}
                value={cardForm.cvv}
              />
            </View>
          </View>

          <View style={styles.cardInputGroup}>
            <Text style={styles.cardInputLabel}>Nome no cartão</Text>
            <TextInput
              autoCapitalize="characters"
              onChangeText={holderName => setCardForm(prev => ({ ...prev, holderName }))}
              placeholder="NOME COMPLETO"
              placeholderTextColor="#7A7A7A"
              style={styles.cardInput}
              value={cardForm.holderName}
            />
          </View>
        </View>

        {renderSimulationNotice()}

        {isProcessingPayment && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.cardOrange} />
            <Text style={styles.loadingText}>Preenchendo dados de teste e processando...</Text>
          </View>
        )}
      </View>
    );
  }

  function renderSuccessContent() {
    const paymentLabel = selectedPayment === 'pix' ? 'PIX' : 'cartão';

    return (
      <View style={styles.successContent}>
        <View style={styles.successIcon}>
          <Feather name="check" size={42} color={Colors.white} />
        </View>

        <Text style={styles.successTitle}>Pagamento confirmado!</Text>
        <Text style={styles.successDescription}>
          Seu pagamento via {paymentLabel} foi aprovado na simulação. O pedido já pode seguir para preparo.
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.9}
          onPress={handleFinish}
          style={styles.doneButton}
        >
          <Text style={styles.doneButtonText}>Voltar ao cardápio</Text>
          <Feather name="arrow-right" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    );
  }

  const modalTitle =
    step === 'success'
      ? 'Pedido concluído'
      : step === 'processing' && selectedPayment === 'pix'
        ? 'Pagamento via PIX'
        : step === 'processing'
          ? 'Dados do cartão'
          : 'Como você quer pagar?';

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Fechar finalização" onPress={handleClose} style={styles.backdrop} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>{modalTitle}</Text>

            <TouchableOpacity
              accessibilityLabel="Fechar finalização"
              activeOpacity={0.8}
              onPress={handleClose}
              style={styles.closeButton}
            >
              <Feather name="x" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {step === 'selecting' && (
            <>
              <View style={styles.options}>
                {PAYMENT_OPTIONS.map(option => {
                  const isSelected = selectedPayment === option.id;
                  const iconColor = isSelected ? Colors.cardOrange : Colors.textGray;

                  return (
                    <TouchableOpacity
                      accessibilityLabel={`${option.label}. ${option.description}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected, selected: isSelected }}
                      activeOpacity={0.86}
                      key={option.id}
                      onPress={() => setSelectedPayment(option.id)}
                      style={[
                        styles.paymentCard,
                        isSelected && styles.paymentCardSelected,
                      ]}
                    >
                      <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
                        <PaymentIcon color={iconColor} method={option.id} />
                      </View>

                      <View style={styles.paymentText}>
                        <Text style={styles.paymentLabel}>{option.label}</Text>
                        <Text style={styles.paymentDescription}>{option.description}</Text>
                      </View>

                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                accessibilityLabel="Confirmar forma de pagamento"
                accessibilityRole="button"
                accessibilityState={{ disabled: !selectedPayment }}
                activeOpacity={0.9}
                disabled={!selectedPayment}
                onPress={handleConfirm}
                style={[
                  styles.confirmButton,
                  !selectedPayment && styles.confirmButtonDisabled,
                ]}
              >
                <Text style={styles.confirmButtonText}>Confirmar</Text>
                <Feather name="check" size={20} color={Colors.white} />
              </TouchableOpacity>
            </>
          )}

          {step === 'processing' && renderProcessingContent()}
          {step === 'success' && renderSuccessContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  sheet: {
    backgroundColor: '#121212',
    borderColor: '#292929',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    minHeight: '50%',
    maxHeight: '82%',
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#4A4A4A',
    borderRadius: 10,
    height: 5,
    marginBottom: 18,
    width: 46,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  title: {
    color: Colors.white,
    flex: 1,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 31,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#242424',
    borderColor: '#333',
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  options: {
    gap: 12,
    marginTop: 22,
  },
  paymentCard: {
    alignItems: 'center',
    backgroundColor: '#202020',
    borderColor: '#333',
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 14,
    minHeight: 88,
    padding: 14,
  },
  paymentCardSelected: {
    backgroundColor: '#2A2116',
    borderColor: Colors.cardOrange,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: '#161616',
    borderColor: '#333',
    borderRadius: 16,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  iconBoxSelected: {
    backgroundColor: '#332615',
    borderColor: 'rgba(255, 152, 0, 0.45)',
  },
  paymentText: {
    flex: 1,
    minWidth: 0,
  },
  paymentLabel: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
  },
  paymentDescription: {
    color: Colors.textGray,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 4,
  },
  radio: {
    alignItems: 'center',
    borderColor: '#555',
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radioSelected: {
    borderColor: Colors.cardOrange,
  },
  radioDot: {
    backgroundColor: Colors.cardOrange,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: Colors.accentRed,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 'auto',
    minHeight: 56,
  },
  confirmButtonDisabled: {
    backgroundColor: '#585858',
    opacity: 0.55,
  },
  confirmButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  processingContent: {
    flex: 1,
    marginTop: 18,
  },
  qrCard: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Colors.white,
    borderRadius: 22,
    justifyContent: 'center',
    padding: 14,
  },
  qrCode: {
    height: 156,
    width: 156,
  },
  processingTitle: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 16,
    textAlign: 'center',
  },
  amountText: {
    color: Colors.accentRed,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 6,
    textAlign: 'center',
  },
  pixCodeBlock: {
    gap: 7,
    marginTop: 14,
  },
  pixCodeLabel: {
    color: '#9A9A9A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pixCodeRow: {
    alignItems: 'center',
    backgroundColor: '#1D1D1D',
    borderColor: '#343434',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  pixCodeRowCopied: {
    backgroundColor: '#2A2116',
    borderColor: 'rgba(255, 152, 0, 0.55)',
  },
  pixCodePreview: {
    color: Colors.textGray,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pixCopiedText: {
    color: Colors.cardOrange,
    fontSize: 11,
    fontWeight: '800',
    marginTop: -2,
  },
  simulationNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#211A10',
    borderColor: 'rgba(255, 152, 0, 0.34)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
    padding: 12,
  },
  simulationNoticeText: {
    color: Colors.textGray,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 18,
  },
  loadingText: {
    color: Colors.textGray,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  cardForm: {
    gap: 12,
  },
  cardInputGroup: {
    gap: 7,
  },
  cardInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cardInputHalf: {
    flex: 1,
    gap: 7,
  },
  cardInputLabel: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  cardInput: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    color: '#111',
    fontSize: 15,
    fontWeight: '700',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  successContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 16,
  },
  successIcon: {
    alignItems: 'center',
    backgroundColor: Colors.accentRed,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 32,
    borderWidth: 1,
    height: 84,
    justifyContent: 'center',
    marginBottom: 18,
    width: 84,
  },
  successTitle: {
    color: Colors.white,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  successDescription: {
    color: Colors.textGray,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: Colors.accentRed,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 54,
    paddingHorizontal: 22,
    width: '100%',
  },
  doneButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
});
