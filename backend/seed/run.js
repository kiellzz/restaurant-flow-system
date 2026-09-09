require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../db');
const MenuItem = require('../models/MenuItem');
const menuSeed = require('./menuSeed');

async function run() {
  await connectDB();
  await MenuItem.deleteMany({});
  await MenuItem.insertMany(menuSeed);
  console.log(`Seed concluído: ${menuSeed.length} itens de cardápio criados.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Erro ao rodar o seed:', err);
  process.exit(1);
});
