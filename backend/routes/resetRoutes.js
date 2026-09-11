const express = require('express');
const { resetDemo } = require('../services/resetDemo');

const router = express.Router();

// POST /api/reset - botão "Resetar Demo" no dashboard + cron externo
router.post('/', async (req, res) => {
  try {
    const result = await resetDemo({ source: 'dashboard' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
