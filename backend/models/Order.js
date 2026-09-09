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
    total: { type: Number, required: true },
    formaPagamento: {
      type: String,
      default: null,
      validate: {
        validator: value => value == null || ['pix', 'cartao'].includes(value),
        message: 'Forma de pagamento inválida',
      },
    },
    status: {
      type: String,
      enum: ['recebido', 'em_preparo', 'pronto', 'entregue'],
      default: 'recebido',
    },
    confirmacaoEntrega: {
      type: String,
      enum: ['pendente', 'confirmado', 'nao_entregue'],
      default: 'pendente',
    },
    resolucaoEntrega: {
      type: new mongoose.Schema({
        descricao: { type: String, required: true, trim: true, maxlength: 500 },
        atendente: { type: String, required: true, trim: true, maxlength: 100 },
        resolvidoEm: { type: Date, required: true },
      }, { _id: false }),
      default: null,
    },
  },
  { timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } }
);

module.exports = mongoose.model('Order', orderSchema);
