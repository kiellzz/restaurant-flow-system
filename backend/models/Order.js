const mongoose = require('mongoose');

const selectedOptionSchema = new mongoose.Schema(
  {
    grupoNome: { type: String, required: true },
    opcaoNome: { type: String, required: true },
    precoAdicional: { type: Number, default: 0 },
    quantidade: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

// Snapshot: guarda nome/preço do item no momento do pedido,
// pra não quebrar pedidos antigos se o cardápio mudar depois.
const orderItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    nome: { type: String, required: true },
    precoUnitario: { type: Number, required: true },
    quantidade: { type: Number, required: true, min: 1 },
    observacao: { type: String, default: '' },
    opcoesSelecionadas: { type: [selectedOptionSchema], default: [] },
    precoUnitarioFinal: { type: Number, default: null },
  },
  { _id: false }
);

const orderTableSchema = new mongoose.Schema(
  {
    numero: { type: Number, min: 1, max: 99, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    cliente: {
      nome: { type: String, required: true },
    },
    mesa: { type: orderTableSchema, default: null },
    itens: { type: [orderItemSchema], required: true },
    observacaoGeral: { type: String, trim: true, maxlength: 500, default: '' },
    total: { type: Number, required: true },
    formaPagamento: {
      type: String,
      default: null,
      validate: {
        validator: value => value == null || ['pix', 'cartao'].includes(value),
        message: 'Forma de pagamento inválida',
      },
    },
    origemPedido: {
      type: String,
      enum: ['cliente', 'manual'],
      default() { return this.formaPagamento == null ? 'manual' : 'cliente'; },
    },
    status: {
      type: String,
      enum: ['recebido', 'em_preparo', 'pronto', 'entregue', 'cancelado'],
      default: 'recebido',
    },
    confirmacaoEntrega: {
      type: String,
      enum: ['pendente', 'confirmado', 'nao_entregue'],
      default: 'pendente',
    },
    historicoEtapas: {
      type: [new mongoose.Schema({
        status: { type: String, enum: ['recebido', 'em_preparo', 'pronto', 'entregue', 'cancelado'], required: true },
        registradoEm: { type: Date, required: true },
      }, { _id: false })],
      default: [],
    },
    resolucaoEntrega: {
      type: new mongoose.Schema({
        descricao: { type: String, required: true, trim: true, maxlength: 500 },
        atendente: { type: String, required: true, trim: true, maxlength: 100 },
        resolvidoEm: { type: Date, required: true },
      }, { _id: false }),
      default: null,
    },
    solicitacaoCancelamento: {
      type: new mongoose.Schema({
        motivo: { type: String, required: true, trim: true, minlength: 5, maxlength: 300 },
        status: { type: String, enum: ['pendente', 'aprovada', 'recusada'], default: 'pendente', required: true },
        solicitadoEm: { type: Date, required: true },
        revisadoEm: { type: Date, default: null },
        atendente: { type: String, trim: true, maxlength: 100, default: null },
      }, { _id: false }),
      default: null,
    },
    cancelamento: {
      type: new mongoose.Schema({
        origem: { type: String, enum: ['cliente', 'equipe'], required: true },
        motivo: {
          type: String,
          default: null,
          trim: true,
          minlength: 5,
          maxlength: 300,
          required() { return this.origem === 'equipe'; },
        },
        atendente: { type: String, trim: true, maxlength: 100, default: null },
        statusAnterior: { type: String, enum: ['recebido', 'em_preparo', 'pronto'], required: true },
        canceladoEm: { type: Date, required: true },
      }, { _id: false }),
      default: null,
    },
    reembolso: {
      type: new mongoose.Schema({
        status: { type: String, enum: ['concluido_simulado', 'nao_aplicavel'], required: true },
        valor: { type: Number, min: 0, required: true },
        formaPagamento: { type: String, enum: ['pix', 'cartao', 'nao_informada'], required: true },
        processadoEm: { type: Date, required: true },
      }, { _id: false }),
      default: null,
    },
  },
  { timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } }
);

module.exports = mongoose.model('Order', orderSchema);
