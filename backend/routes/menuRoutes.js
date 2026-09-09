const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const MenuItem = require('../models/MenuItem');
const { broadcastRealtimeEvent } = require('../realtime');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'menu');
const MIME_EXTENSION_BY_TYPE = {
  jpeg: 'jpg',
  jpg: 'jpg',
  png: 'png',
  webp: 'webp',
};

function sanitizeFileName(fileName = 'item') {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 42) || 'item';
}

// POST /api/menu/uploads - salva imagem recortada pelo dashboard
router.post('/uploads', async (req, res) => {
  try {
    const { dataUrl, fileName } = req.body;

    if (typeof dataUrl !== 'string') {
      return res.status(400).json({ erro: 'Imagem inválida.' });
    }

    const match = dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=]+)$/i);

    if (!match) {
      return res.status(400).json({ erro: 'Formato de imagem inválido.' });
    }

    const imageType = match[1].toLowerCase();
    const extension = MIME_EXTENSION_BY_TYPE[imageType];
    const imageBuffer = Buffer.from(match[2], 'base64');

    if (imageBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ erro: 'Imagem muito grande.' });
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const safeName = sanitizeFileName(fileName);
    const storedFileName = `${Date.now()}-${safeName}.${extension}`;
    const uploadPath = path.join(UPLOAD_DIR, storedFileName);

    await fs.writeFile(uploadPath, imageBuffer);

    const imagem = `/uploads/menu/${storedFileName}`;

    res.status(201).json({
      imagem,
      url: `${req.protocol}://${req.get('host')}${imagem}`,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/menu - lista completa (tela de cardápio do cliente)
router.get('/', async (req, res) => {
  try {
    const itens = await MenuItem.find().sort({ categoria: 1, nome: 1 });
    res.json(itens);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/menu/:id - editar item (dashboard: preço, desconto, disponibilidade)
router.put('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ erro: 'Item não encontrado' });
    res.json(item);
    broadcastRealtimeEvent('menu:changed', {
      action: 'updated',
      itemId: item._id,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// POST /api/menu - criar item novo (dashboard)
router.post('/', async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json(item);
    broadcastRealtimeEvent('menu:changed', {
      action: 'created',
      itemId: item._id,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// DELETE /api/menu/:id - remover item (dashboard)
router.delete('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ erro: 'Item não encontrado' });
    res.json({ ok: true });
    broadcastRealtimeEvent('menu:changed', {
      action: 'deleted',
      itemId: item._id,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
