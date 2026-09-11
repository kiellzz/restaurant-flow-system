import { Colors } from '@/constants/Colors';
import type { ApiDeliveryConfirmation, ApiOrder, ApiOrderStatus } from '@/services/api';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  orders: ApiOrder[];
  loading: boolean;
  error: string;
  busyOrderIds: Set<string>;
  onClose: () => void;
  onRetry: () => void;
  onConfirm: (id: string, confirmation: ApiDeliveryConfirmation) => void;
  onCancel: (id: string) => Promise<boolean>;
  onRequestCancel: (id: string, reason: string) => Promise<boolean>;
};

const STEPS: ApiOrderStatus[] = ['recebido', 'em_preparo', 'pronto', 'entregue'];
const LABELS = ['Recebido', 'Em preparo', 'Pronto', 'Entregue'];
const STATUS_COPY: Record<ApiOrderStatus, { title: string; description: string }> = {
  recebido: { title: 'Pedido recebido', description: 'A equipe já recebeu seu pedido. Em breve, vamos começar o preparo.' },
  em_preparo: { title: 'Preparando seu pedido', description: 'Seu pedido está na cozinha. Avisaremos por aqui quando estiver pronto.' },
  pronto: { title: 'Prontinho para você', description: 'Seu pedido está pronto e a equipe vai levá-lo até sua mesa.' },
  entregue: { title: 'Seu pedido chegou?', description: 'A equipe marcou a entrega. Confirme abaixo se está tudo certo.' },
  cancelado: { title: 'Pedido cancelado', description: 'Este pedido foi encerrado e retirado da fila.' },
};

export function isCustomerOrderActive(order: ApiOrder) {
  return order.status !== 'cancelado' && (order.status !== 'entregue' ||
    (order.confirmacaoEntrega !== 'confirmado' && !order.resolucaoEntrega));
}

function orderLabel(order: ApiOrder) {
  return `PED-${order._id.slice(-5).toUpperCase()}`;
}

function currency(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function orderDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function itemCount(order: ApiOrder) {
  const count = order.itens.reduce((total, item) => total + item.quantidade, 0);
  return `${count} ${count === 1 ? 'item' : 'itens'}`;
}

function OrderDetails({ order }: { order: ApiOrder }) {
  const timelineStatus = order.cancelamento?.statusAnterior ?? order.status;
  return (
    <View style={styles.details}>
      <View style={styles.timeline}>
        <Text style={styles.timelineHeading}>Histórico das etapas</Text>
        {STEPS.map((status, index) => {
          const date = order.historicoEtapas?.find(entry => entry.status === status)?.registradoEm
            ?? (status === 'recebido' ? order.criadoEm : undefined);
          const reached = index <= STEPS.indexOf(timelineStatus);
          return (
            <View key={status} style={styles.timelineRow}>
              <Feather name={date ? 'check-circle' : 'clock'} size={14} color={date ? '#8FD8AE' : '#92929E'} />
              <View style={styles.flexible}>
                <Text style={styles.timelineLabel}>{LABELS[index]}</Text>
                <Text style={styles.metadata}>{date
                  ? new Date(date).toLocaleString('pt-BR')
                  : reached ? 'Horário não registrado' : 'Aguardando esta etapa'}</Text>
              </View>
            </View>
          );
        })}
        {order.cancelamento && (
          <View style={styles.timelineRow}>
            <Feather name="x-circle" size={14} color="#F08080" />
            <View style={styles.flexible}>
              <Text style={styles.timelineCancelled}>Cancelado</Text>
              <Text style={styles.metadata}>{new Date(order.cancelamento.canceladoEm).toLocaleString('pt-BR')}</Text>
            </View>
          </View>
        )}
      </View>
      {order.itens.map((item, index) => (
        <View key={`${order._id}-${index}`} style={styles.item}>
          <View style={styles.itemRow}>
            <Text style={styles.quantity}>{item.quantidade}×</Text>
            <Text style={styles.itemName}>{item.nome}</Text>
          </View>
          {!!item.opcoesSelecionadas?.length && (
            <Text style={styles.itemNote}>{item.opcoesSelecionadas.map(option => `${option.quantidade}× ${option.opcaoNome}`).join(' · ')}</Text>
          )}
          {!!item.observacao && <Text style={styles.itemNote}>Obs.: {item.observacao}</Text>}
        </View>
      ))}
      {order.resolucaoEntrega && (
        <View style={styles.resolution}>
          <View style={styles.inlineRow}>
            <Feather name="check-circle" size={15} color="#8FD8AE" />
            <Text style={styles.resolutionTitle}>Ocorrência resolvida</Text>
          </View>
          <Text style={styles.description}>{order.resolucaoEntrega.descricao}</Text>
          <Text style={styles.metadata}>{order.resolucaoEntrega.atendente} · {orderDate(order.resolucaoEntrega.resolvidoEm)}</Text>
        </View>
      )}
      {order.cancelamento && (
        <View style={styles.cancellationRecord}>
          <View style={styles.inlineRow}>
            <Feather name="x-circle" size={15} color="#F08080" />
            <Text style={styles.cancellationTitle}>Cancelado {order.cancelamento.origem === 'cliente' ? 'por você' : 'pela equipe'}</Text>
          </View>
          {order.cancelamento.motivo && <Text style={styles.description}>{order.cancelamento.motivo}</Text>}
          {order.cancelamento.atendente && <Text style={styles.metadata}>Responsável: {order.cancelamento.atendente}</Text>}
          {order.reembolso?.status === 'concluido_simulado' ? (
            <View style={styles.refundBox}>
              <Text style={styles.refundTitle}>Reembolso simulado concluído</Text>
              <Text style={styles.metadata}>{currency(order.reembolso.valor)} · {order.reembolso.formaPagamento === 'pix' ? 'PIX' : 'Cartão'} · {orderDate(order.reembolso.processadoEm)}</Text>
              <Text style={styles.refundNote}>Esta demonstração não movimenta dinheiro real.</Text>
            </View>
          ) : <Text style={styles.refundNote}>Sem reembolso: este pedido não possuía pagamento registrado.</Text>}
        </View>
      )}
    </View>
  );
}

export function CustomerOrdersModal({ visible, orders, loading, error, busyOrderIds, onClose, onRetry, onConfirm, onCancel, onRequestCancel }: Props) {
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => new Set());
  const [cancellingOrderId, setCancellingOrderId] = React.useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = React.useState('');
  const activeOrders = orders.filter(isCustomerOrderActive);
  const completedOrders = orders.filter(order => !isCustomerOrderActive(order));

  function resetView() {
    setHistoryOpen(false);
    setExpandedIds(new Set());
    setCancellingOrderId(null);
    setCancellationReason('');
  }

  function toggleDetails(id: string) {
    setExpandedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitCancellation(order: ApiOrder) {
    if (order.status === 'em_preparo' && cancellationReason.trim().length < 5) return;
    const cancelled = order.status === 'recebido'
      ? await onCancel(order._id)
      : await onRequestCancel(order._id, cancellationReason.trim());
    if (cancelled) {
      setCancellingOrderId(null);
      setCancellationReason('');
    }
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onShow={resetView} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} accessibilityLabel="Fechar pedidos" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.flexible}>
              <Text style={styles.eyebrow}>Meus pedidos</Text>
              <Text style={styles.title} accessibilityRole="header">Acompanhe por aqui</Text>
              <Text style={styles.subtitle}>Do preparo até a sua mesa.</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar pedidos" style={styles.closeButton}>
              <Feather name="x" size={21} color="#C8C8C8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {!!error && (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Text style={styles.description}>{error}</Text>
                <TouchableOpacity onPress={onRetry} accessibilityRole="button" style={styles.retryButton}>
                  <Text style={styles.linkText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            )}
            {loading && orders.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={Colors.cardOrange} />
                <Text style={styles.description}>Carregando seus pedidos...</Text>
              </View>
            ) : !error && orders.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="shopping-bag" size={28} color={Colors.cardOrange} />
                <Text style={styles.emptyTitle}>Seu próximo pedido começa no cardápio</Text>
                <Text style={styles.emptyDescription}>Quando você pedir, acompanhe cada etapa aqui.</Text>
              </View>
            ) : (
              <>
                {activeOrders.length > 0 ? (
                  <>
                    <View style={styles.sectionHeading}>
                      <View style={styles.inlineRow}>
                        <View style={styles.liveDot} />
                        <Text style={styles.sectionTitle}>Em andamento</Text>
                      </View>
                      <Text style={styles.count}>{activeOrders.length}</Text>
                    </View>
                    {activeOrders.map(order => {
                      const hasIssue = order.status === 'entregue' && order.confirmacaoEntrega === 'nao_entregue';
                      const needsConfirmation = order.status === 'entregue' && !hasIssue;
                      const busy = busyOrderIds.has(order._id);
                      const expanded = expandedIds.has(order._id);
                      const stepIndex = STEPS.indexOf(order.status);
                      const copy = STATUS_COPY[order.status];
                      return (
                        <View key={order._id} style={[styles.activeCard, (hasIssue || needsConfirmation) && styles.attentionCard]}>
                          <View style={styles.cardMeta}>
                            <Text style={styles.orderId}>{orderLabel(order)}</Text>
                            <Text style={styles.metadata}>{order.mesa ? `Mesa ${String(order.mesa.numero).padStart(2, '0')}` : orderDate(order.criadoEm)}</Text>
                          </View>
                          <Text style={styles.statusTitle}>{hasIssue ? 'Estamos verificando a entrega' : copy.title}</Text>
                          <Text style={styles.description}>{hasIssue ? 'Você avisou que não recebeu. A equipe vai conferir e a resposta aparecerá aqui.' : copy.description}</Text>
                          {!hasIssue && (
                            <View style={styles.progress} accessibilityLabel={`Etapa ${stepIndex + 1} de 4: ${LABELS[stepIndex]}`}>
                              {STEPS.map((step, index) => (
                                <View key={step} style={styles.step}>
                                  <View style={[styles.stepBar, index <= stepIndex && styles.stepBarDone]} />
                                  <Text style={[styles.stepLabel, index === stepIndex && styles.stepLabelCurrent]}>{LABELS[index]}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                          {hasIssue && (
                            <View style={styles.issueLabel}>
                              <Feather name="message-circle" size={15} color={Colors.cardOrange} />
                              <Text style={styles.issueText}>Aguardando retorno da equipe</Text>
                            </View>
                          )}
                          {needsConfirmation && (
                            <View style={styles.confirmation}>
                              <View style={styles.confirmActions}>
                                <TouchableOpacity disabled={busy} onPress={() => onConfirm(order._id, 'confirmado')}
                                  accessibilityRole="button" accessibilityLabel="Confirmar pedido entregue" accessibilityState={{ disabled: busy }}
                                  style={[styles.confirmButton, styles.receivedButton, busy && styles.disabled]}>
                                  <Feather name="check" size={17} color="#A5E5BE" />
                                  <Text style={styles.receivedText}>Recebi</Text>
                                </TouchableOpacity>
                                <TouchableOpacity disabled={busy} onPress={() => onConfirm(order._id, 'nao_entregue')}
                                  accessibilityRole="button" accessibilityLabel="Informar que pedido não foi entregue" accessibilityState={{ disabled: busy }}
                                  style={[styles.confirmButton, busy && styles.disabled]}>
                                  <Text style={styles.notReceivedText}>Não recebi</Text>
                                </TouchableOpacity>
                              </View>
                              {busy && <Text style={styles.metadata} accessibilityLiveRegion="polite">Salvando confirmação...</Text>}
                            </View>
                          )}
                          <View style={styles.cardFooter}>
                            <View>
                              <Text style={styles.metadata}>{itemCount(order)}</Text>
                              <Text style={styles.total}>{currency(order.total)}</Text>
                            </View>
                            <TouchableOpacity onPress={() => toggleDetails(order._id)} accessibilityRole="button" accessibilityState={{ expanded }} aria-expanded={expanded}
                              accessibilityLabel={`${expanded ? 'Ocultar' : 'Ver'} detalhes e etapas de ${orderLabel(order)}`} style={styles.detailsButton}>
                              <Text style={styles.detailLabel}>{expanded ? 'Ocultar detalhes' : 'Detalhes e etapas'}</Text>
                              <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#B3B3B3" />
                            </TouchableOpacity>
                          </View>
                          {order.solicitacaoCancelamento?.status === 'pendente' && (
                            <View style={styles.requestStatus}>
                              <Feather name="clock" size={15} color="#E5B46B" />
                              <View style={styles.flexible}>
                                <Text style={styles.requestStatusTitle}>Cancelamento aguardando aprovação</Text>
                                <Text style={styles.metadata}>A equipe recebeu sua explicação. O pedido continua em preparo até a decisão.</Text>
                              </View>
                            </View>
                          )}
                          {order.solicitacaoCancelamento?.status === 'recusada' && (
                            <View style={styles.requestStatus}>
                              <Feather name="info" size={15} color="#A9B9D3" />
                              <View style={styles.flexible}>
                                <Text style={styles.requestStatusTitle}>Solicitação não aprovada</Text>
                                <Text style={styles.metadata}>A equipe manteve o pedido em preparo.</Text>
                              </View>
                            </View>
                          )}
                          {(order.status === 'recebido' || (order.status === 'em_preparo' && !order.solicitacaoCancelamento)) && cancellingOrderId !== order._id && (
                            <TouchableOpacity
                              accessibilityRole="button"
                              disabled={busy}
                              onPress={() => { setCancellingOrderId(order._id); setCancellationReason(''); }}
                              style={styles.cancelLink}
                            >
                              <Text style={styles.cancelLinkText}>{order.status === 'recebido' ? 'Cancelar pedido' : 'Solicitar cancelamento'}</Text>
                            </TouchableOpacity>
                          )}
                          {(order.status === 'recebido' || order.status === 'em_preparo') && cancellingOrderId === order._id && (
                            <View style={styles.cancelWarning}>
                              <Text style={styles.cancelWarningTitle}>{order.status === 'recebido' ? 'Cancelar este pedido?' : 'Solicitar cancelamento?'}</Text>
                              <Text style={styles.description}>{order.status === 'recebido'
                                ? 'O preparo ainda não começou. Confirme para retirar o pedido da fila e registrar o reembolso simulado. Esta ação não pode ser desfeita.'
                                : 'Como o preparo já começou, explique o motivo. A equipe avaliará a solicitação e o pedido continuará em andamento até a decisão.'}</Text>
                              {order.status === 'em_preparo' && (
                                <TextInput
                                  accessibilityLabel="Motivo da solicitação de cancelamento"
                                  maxLength={300}
                                  multiline
                                  onChangeText={setCancellationReason}
                                  placeholder="Por que você precisa cancelar?"
                                  placeholderTextColor="#777780"
                                  style={styles.cancelInput}
                                  value={cancellationReason}
                                />
                              )}
                              <View style={styles.cancelActions}>
                                <TouchableOpacity disabled={busy} onPress={() => setCancellingOrderId(null)} style={styles.cancelBackButton}>
                                  <Text style={styles.detailLabel}>Manter pedido</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  accessibilityRole="button"
                                  accessibilityState={{ disabled: busy || (order.status === 'em_preparo' && cancellationReason.trim().length < 5) }}
                                  disabled={busy || (order.status === 'em_preparo' && cancellationReason.trim().length < 5)}
                                  onPress={() => void submitCancellation(order)}
                                  style={[styles.cancelConfirmButton, (busy || (order.status === 'em_preparo' && cancellationReason.trim().length < 5)) && styles.disabled]}
                                >
                                  <Text style={styles.cancelConfirmText}>{busy ? 'Enviando...' : order.status === 'recebido' ? 'Confirmar cancelamento' : 'Enviar solicitação'}</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                          {expanded && <OrderDetails order={order} />}
                        </View>
                      );
                    })}
                  </>
                ) : orders.length > 0 && (
                  <View style={styles.caughtUp}>
                    <View style={styles.caughtUpIcon}><Feather name="check" size={24} color="#8FD8AE" /></View>
                    <Text style={styles.emptyTitle}>Tudo certo por aqui</Text>
                    <Text style={styles.emptyDescription}>Você não tem pedidos em andamento.{ '\n' }Os anteriores ficam no histórico abaixo.</Text>
                  </View>
                )}

                {completedOrders.length > 0 && (
                  <View style={styles.historySection}>
                    <TouchableOpacity onPress={() => setHistoryOpen(current => !current)} accessibilityRole="button"
                      accessibilityLabel={`Pedidos encerrados, ${completedOrders.length}`} accessibilityState={{ expanded: historyOpen }} aria-expanded={historyOpen} style={styles.historyToggle}>
                      <Feather name="clock" size={19} color="#959595" />
                      <View style={styles.flexible}>
                        <Text style={styles.historyTitle}>Pedidos encerrados</Text>
                        <Text style={styles.historySubtitle}>Toque para {historyOpen ? 'recolher' : 'consultar o histórico'}</Text>
                      </View>
                      <Text style={styles.count}>{completedOrders.length}</Text>
                      <Feather name={historyOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#959595" />
                    </TouchableOpacity>
                    {historyOpen && completedOrders.map(order => {
                      const expanded = expandedIds.has(order._id);
                      return (
                        <View key={order._id} style={styles.historyCard}>
                          <TouchableOpacity onPress={() => toggleDetails(order._id)} accessibilityRole="button"
                            accessibilityLabel={`Detalhes de ${orderLabel(order)}`} accessibilityState={{ expanded }} aria-expanded={expanded} style={styles.historyOrderToggle}>
                            <View style={styles.flexible}>
                              <Text style={styles.historyOrderId}>{orderLabel(order)}</Text>
                              <Text style={styles.historySubtitle}>{orderDate(order.criadoEm)} · {itemCount(order)}</Text>
                            </View>
                            <Text style={styles.historyAmount}>{currency(order.total)}</Text>
                            <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#959595" />
                          </TouchableOpacity>
                          {expanded && (
                            <View style={styles.historyDetails}>
                              <Text style={styles.metadata}>{order.status === 'cancelado' ? 'Pedido cancelado' : order.resolucaoEntrega ? 'Concluído após atendimento' : 'Entrega confirmada por você'}</Text>
                              <OrderDetails order={order} />
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  timelineCancelled: { color: '#F2AAAA', fontSize: 12, fontWeight: '600', marginBottom: 3 },
  cancellationRecord: { borderTopWidth: 1, borderTopColor: '#3B3032', paddingTop: 12, marginTop: 3, gap: 8 },
  cancellationTitle: { color: '#F2AAAA', fontSize: 12, fontWeight: '600' },
  refundBox: { backgroundColor: '#203129', borderRadius: 10, padding: 11, gap: 4, marginTop: 3 },
  refundTitle: { color: '#9DDBB5', fontSize: 12, fontWeight: '600' },
  refundNote: { color: '#9999A3', fontSize: 10, lineHeight: 16 },
  cancelLink: { alignSelf: 'flex-start', minHeight: 42, justifyContent: 'center', marginTop: 5 },
  cancelLinkText: { color: '#E49A9A', fontSize: 12, fontWeight: '500' },
  cancelWarning: { backgroundColor: '#2B2022', borderWidth: 1, borderColor: '#583539', borderRadius: 13, padding: 13, gap: 11, marginTop: 10 },
  cancelWarningTitle: { color: '#F5EDED', fontSize: 14, fontWeight: '600' },
  cancelInput: { minHeight: 72, borderWidth: 1, borderColor: '#574145', backgroundColor: '#201A1C', borderRadius: 10, padding: 11, color: '#F2F2F4', fontSize: 12, lineHeight: 18, textAlignVertical: 'top' },
  requestStatus: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: '#242327', borderWidth: 1, borderColor: '#3B3940', borderRadius: 11, padding: 11, marginTop: 10 },
  requestStatusTitle: { color: '#E8E5EA', fontSize: 12, fontWeight: '600', marginBottom: 3 },
  cancelActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  cancelBackButton: { minHeight: 42, paddingHorizontal: 12, justifyContent: 'center' },
  cancelConfirmButton: { minHeight: 42, paddingHorizontal: 13, borderRadius: 10, backgroundColor: '#C92525', justifyContent: 'center' },
  cancelConfirmText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  timeline: { gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#34343B', marginBottom: 8 },
  timelineHeading: { color: '#EEEEF2', fontSize: 13, fontWeight: '600' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineLabel: { color: '#D4D4DD', fontSize: 12, fontWeight: '500', marginBottom: 3 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 440, maxHeight: '85%', alignSelf: 'center', backgroundColor: '#141414', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 26, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 22, paddingBottom: 20 },
  flexible: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#B8B8C2', fontSize: 13, fontWeight: '600', lineHeight: 18, letterSpacing: 0.2, marginBottom: 7 },
  title: { color: '#F5F5F5', fontSize: 23, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#999', fontSize: 13, lineHeight: 19, marginTop: 5 },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#232323', borderRadius: 14 },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 22, gap: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 2 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.cardOrange },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#E2E2E2' },
  count: { fontSize: 11, color: '#BABABA', backgroundColor: '#292929', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  activeCard: { backgroundColor: '#202020', borderWidth: 1, borderColor: '#323232', borderRadius: 19, padding: 16 },
  attentionCard: { borderColor: '#705123' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 15 },
  orderId: { color: '#B7B7B7', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  metadata: { color: '#999', fontSize: 11, lineHeight: 17 },
  statusTitle: { color: '#FAFAFA', fontSize: 19, fontWeight: '700', lineHeight: 25, marginBottom: 6 },
  description: { color: '#B6B6B6', fontSize: 13, lineHeight: 20 },
  progress: { flexDirection: 'row', gap: 6, marginTop: 20, marginBottom: 3 },
  step: { flex: 1, minWidth: 0, gap: 7 },
  stepBar: { height: 4, borderRadius: 2, backgroundColor: '#3B3B3B' },
  stepBarDone: { backgroundColor: Colors.cardOrange },
  stepLabel: { color: '#A0A0A0', fontSize: 10, lineHeight: 14, textAlign: 'center' },
  stepLabelCurrent: { color: '#F5C479', fontWeight: '600' },
  issueLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  issueText: { color: '#E8B469', fontSize: 12, lineHeight: 18, flex: 1 },
  confirmation: { marginTop: 18, gap: 8 },
  confirmActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  confirmButton: { flex: 1, minWidth: 100, minHeight: 44, padding: 10, flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#444', borderRadius: 12 },
  receivedButton: { backgroundColor: '#20382A', borderColor: '#355A43' },
  receivedText: { color: '#A5E5BE', fontSize: 13, fontWeight: '600' },
  notReceivedText: { color: '#D7B3AE', fontSize: 13, fontWeight: '500' },
  disabled: { opacity: 0.5 },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#333', marginTop: 18, paddingTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  total: { color: '#F2F2F2', fontSize: 16, fontWeight: '600', marginTop: 2 },
  detailsButton: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingLeft: 10 },
  detailLabel: { color: '#B3B3B3', fontSize: 12 },
  details: { marginTop: 12, gap: 10 },
  item: { gap: 3 },
  itemRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  quantity: { color: '#9D9D9D', fontSize: 12, lineHeight: 19 },
  itemName: { color: '#DDD', fontSize: 13, lineHeight: 19, flex: 1 },
  itemNote: { color: '#999', fontSize: 11, lineHeight: 17, paddingLeft: 24 },
  historySection: { borderTopWidth: 1, borderTopColor: '#2C2C2C', paddingTop: 4, marginTop: 4 },
  historyToggle: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 16, minHeight: 64 },
  historyTitle: { color: '#BABABA', fontSize: 13, fontWeight: '500' },
  historySubtitle: { color: '#969696', fontSize: 11, lineHeight: 17, marginTop: 3 },
  historyCard: { borderWidth: 1, borderColor: '#2D2D2D', borderRadius: 14, marginBottom: 9, overflow: 'hidden' },
  historyOrderToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, minHeight: 64 },
  historyOrderId: { color: '#BEBEBE', fontSize: 12, fontWeight: '500' },
  historyAmount: { color: '#C3C3C3', fontSize: 12, fontWeight: '500' },
  historyDetails: { paddingHorizontal: 13, paddingBottom: 14 },
  resolution: { borderTopWidth: 1, borderTopColor: '#303030', paddingTop: 12, marginTop: 3, gap: 8 },
  resolutionTitle: { color: '#8FD8AE', fontSize: 12, fontWeight: '600' },
  caughtUp: { alignItems: 'center', paddingVertical: 22, gap: 10 },
  caughtUpIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#203027', alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  emptyState: { alignItems: 'center', padding: 24, gap: 14 },
  emptyTitle: { color: '#E7E7E7', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  emptyDescription: { color: '#A0A0A0', fontSize: 13, lineHeight: 21, textAlign: 'center' },
  errorBox: { backgroundColor: '#2D231D', borderRadius: 12, padding: 14 },
  retryButton: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: Colors.cardOrange, fontSize: 13, fontWeight: '600' },
});
