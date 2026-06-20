const express = require('express');
const router = express.Router();
const { chatWithGroq } = require('../services/aiService');

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const businessId = req.business_id;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    // Basic validation to prevent excessively large histories
    if (messages.length > 20) {
      return res.status(400).json({ error: 'Message history too long' });
    }

    // Ensure all messages have role and content
    const isValid = messages.every(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    const reply = await chatWithGroq(messages, businessId);
    
    res.json({ reply });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

module.exports = router;
