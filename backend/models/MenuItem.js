const mongoose = require('mongoose');

const menuItemOptionSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    precoAdicional: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const menuItemOptionGroupSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    tipo: {
      type: String,
      required: true,
      enum: ['unica', 'multipla'],
    },
    obrigatorio: { type: Boolean, default: false },
    permiteQuantidade: { type: Boolean, default: false },
    opcoes: { type: [menuItemOptionSchema], default: [] },
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    categoria: {
      type: String,
      required: true,
      enum: ['Lanches', 'Pratos principais', 'Bebidas', 'Sobremesas'],
    },
    preco: { type: Number, required: true },
    precoComDesconto: { type: Number, default: null },
    descricao: { type: String, default: '' },
    imagem: { type: String, default: '' },
    disponivel: { type: Boolean, default: true },
    tipo: {
      type: String,
      enum: ['simples', 'com_acompanhamento'],
      default: 'simples',
    },
    gruposOpcoes: { type: [menuItemOptionGroupSchema], default: [] },
  },
  { timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
