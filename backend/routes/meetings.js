const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get user's meetings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM meetings WHERE host_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ meetings: result.rows });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Failed to get meetings' });
  }
});

// Create new meeting
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, startTime, duration = 60, maxParticipants = 100 } = req.body;

    // Generate unique meeting link
    const meetingLink = uuidv4();

    // Create meeting
    const result = await query(
      'INSERT INTO meetings (title, description, meeting_link, host_id, start_time, duration, max_participants) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, description, meetingLink, req.user.id, startTime, duration, maxParticipants]
    );

    const meeting = result.rows[0];

    res.status(201).json({
      message: 'Meeting created successfully',
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        meetingLink: meeting.meeting_link,
        hostId: meeting.host_id,
        startTime: meeting.start_time,
        duration: meeting.duration,
        maxParticipants: meeting.max_participants,
        status: meeting.status,
        createdAt: meeting.created_at
      }
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Get meeting by link (public route) - MUST come before /:id route
router.get('/link/:meetingLink', async (req, res) => {
  try {
    const { meetingLink } = req.params;

    // Find meeting by link
    const meetingResult = await query(
      'SELECT * FROM meetings WHERE meeting_link = $1',
      [meetingLink]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    res.json({
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        meetingLink: meeting.meeting_link,
        hostId: meeting.host_id,
        startTime: meeting.start_time,
        status: meeting.status
      }
    });
  } catch (error) {
    console.error('Get meeting by link error:', error);
    res.status(500).json({ error: 'Failed to get meeting' });
  }
});

// Get meeting by ID (public route for guests) - MUST come before /:id route
router.get('/guest/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM meetings WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meeting = result.rows[0];

    res.json({
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        meetingLink: meeting.meeting_link,
        hostId: meeting.host_id,
        startTime: meeting.start_time,
        status: meeting.status
      }
    });
  } catch (error) {
    console.error('Get meeting by ID error:', error);
    res.status(500).json({ error: 'Failed to get meeting' });
  }
});

// Get meeting by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM meetings WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meeting = result.rows[0];

    // Check if user can access this meeting
    if (meeting.host_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ meeting });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ error: 'Failed to get meeting' });
  }
});

// Update meeting
router.put('/:id', [
  body('title').optional().isLength({ min: 1, max: 255 }),
  body('description').optional().isLength({ max: 1000 }),
  body('startTime').optional().isISO8601(),
  body('duration').optional().isInt({ min: 15, max: 480 }),
  body('maxParticipants').optional().isInt({ min: 2, max: 1000 })
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, description, startTime, duration, maxParticipants } = req.body;

    // Check if user owns the meeting
    const meetingResult = await query('SELECT host_id FROM meetings WHERE id = $1', [id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meetingResult.rows[0].host_id !== req.user.id) {
      return res.status(403).json({ error: 'Only meeting host can update meeting' });
    }

    // Update meeting
    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }
    if (startTime !== undefined) {
      updateFields.push(`start_time = $${paramIndex}`);
      params.push(startTime);
      paramIndex++;
    }
    if (duration !== undefined) {
      updateFields.push(`duration = $${paramIndex}`);
      params.push(duration);
      paramIndex++;
    }
    if (maxParticipants !== undefined) {
      updateFields.push(`max_participants = $${paramIndex}`);
      params.push(maxParticipants);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await query(
      `UPDATE meetings SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const meeting = result.rows[0];

    res.json({
      message: 'Meeting updated successfully',
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        meetingLink: meeting.meeting_link,
        hostId: meeting.host_id,
        startTime: meeting.start_time,
        endTime: meeting.end_time,
        duration: meeting.duration,
        maxParticipants: meeting.max_participants,
        status: meeting.status,
        updatedAt: meeting.updated_at
      }
    });
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// Delete meeting
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the meeting
    const meetingResult = await query('SELECT host_id FROM meetings WHERE id = $1', [id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meetingResult.rows[0].host_id !== req.user.id) {
      return res.status(403).json({ error: 'Only meeting host can delete meeting' });
    }

    // Delete meeting (cascade will handle related records)
    await query('DELETE FROM meetings WHERE id = $1', [id]);

    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

// Join meeting by link
router.post('/join/:meetingLink', authenticateToken, async (req, res) => {
  try {
    const { meetingLink } = req.params;

    // Find meeting by link
    const meetingResult = await query(
      'SELECT * FROM meetings WHERE meeting_link = $1',
      [meetingLink]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    res.json({
      message: 'Joined meeting successfully',
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        meetingLink: meeting.meeting_link,
        hostId: meeting.host_id,
        startTime: meeting.start_time,
        status: meeting.status
      }
    });
  } catch (error) {
    console.error('Join meeting error:', error);
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

// Join meeting by ID (public route for guests)
router.post('/join-id/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find meeting by ID
    const meetingResult = await query(
      'SELECT * FROM meetings WHERE id = $1',
      [id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    res.json({
      message: 'Joined meeting successfully',
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        meetingLink: meeting.meeting_link,
        hostId: meeting.host_id,
        startTime: meeting.start_time,
        status: meeting.status
      }
    });
  } catch (error) {
    console.error('Join meeting error:', error);
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

// Get meeting participants
router.get('/:id/participants', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user can access this meeting
    const meetingResult = await query('SELECT host_id FROM meetings WHERE id = $1', [id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];
    if (meeting.host_id !== req.user.id) {
      const participantResult = await query(
        'SELECT id FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (participantResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get participants
    const result = await query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_url, 
              mp.joined_at, mp.left_at, mp.role, mp.is_audio_enabled, mp.is_video_enabled
       FROM users u
       JOIN meeting_participants mp ON u.id = mp.user_id
       WHERE mp.meeting_id = $1
       ORDER BY mp.joined_at ASC`,
      [id]
    );

    res.json({
      participants: result.rows.map(p => ({
        id: p.id,
        username: p.username,
        firstName: p.first_name,
        lastName: p.last_name,
        avatarUrl: p.avatar_url,
        joinedAt: p.joined_at,
        leftAt: p.left_at,
        role: p.role,
        isAudioEnabled: p.is_audio_enabled,
        isVideoEnabled: p.is_video_enabled,
        isOnline: p.left_at === null
      }))
    });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

module.exports = router; 