const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Store WebRTC offer
router.post('/offer', authenticateToken, async (req, res) => {
  try {
    const { meetingId, toUserId, offer } = req.body;

    await query(
      'INSERT INTO webrtc_signals (meeting_id, from_user_id, to_user_id, signal_type, signal_data) VALUES ($1, $2, $3, $4, $5)',
      [meetingId, req.user.id, toUserId, 'offer', offer]
    );

    res.json({ message: 'Offer stored successfully' });
  } catch (error) {
    console.error('Store offer error:', error);
    res.status(500).json({ error: 'Failed to store offer' });
  }
});

// Store WebRTC answer
router.post('/answer', authenticateToken, async (req, res) => {
  try {
    const { meetingId, toUserId, answer } = req.body;

    await query(
      'INSERT INTO webrtc_signals (meeting_id, from_user_id, to_user_id, signal_type, signal_data) VALUES ($1, $2, $3, $4, $5)',
      [meetingId, req.user.id, toUserId, 'answer', answer]
    );

    res.json({ message: 'Answer stored successfully' });
  } catch (error) {
    console.error('Store answer error:', error);
    res.status(500).json({ error: 'Failed to store answer' });
  }
});

// Store ICE candidate
router.post('/ice-candidate', authenticateToken, async (req, res) => {
  try {
    const { meetingId, toUserId, candidate } = req.body;

    await query(
      'INSERT INTO webrtc_signals (meeting_id, from_user_id, to_user_id, signal_type, signal_data) VALUES ($1, $2, $3, $4, $5)',
      [meetingId, req.user.id, toUserId, 'ice-candidate', candidate]
    );

    res.json({ message: 'ICE candidate stored successfully' });
  } catch (error) {
    console.error('Store ICE candidate error:', error);
    res.status(500).json({ error: 'Failed to store ICE candidate' });
  }
});

module.exports = router; 