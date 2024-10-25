const express = require('express');
const router = express.Router();
const Dimension = require('../../models/Dimension'); // 引入维度模型

// POST 请求，创建维度对象
router.post('/dimension', async (req, res) => {
  const { name } = req.body;

  const type = 'NOT_MEASURE_DIMENSION';

  try {
    const newDimension = await Dimension.create({ name, type });
    res.status(201).json(newDimension);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create dimension' });
  }
});

module.exports = router;
