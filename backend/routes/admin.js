const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;
    
    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClause = 'WHERE username ILIKE $1 OR email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1';
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await query(
      `SELECT id, email, username, first_name, last_name, avatar_url, is_admin, is_verified, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      users: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, email, username, first_name, last_name, avatar_url, is_admin, is_verified, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, firstName, lastName, isAdmin, isVerified } = req.body;

    const result = await query(
      'UPDATE users SET username = $1, first_name = $2, last_name = $3, is_admin = $4, is_verified = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [username, firstName, lastName, isAdmin, isVerified, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = '30' } = req.query; // days

    // Total users
    const totalUsers = await query('SELECT COUNT(*) FROM users');
    
    // New users in period
    const newUsers = await query(
      'SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL \'$1 days\'',
      [period]
    );

    // Total meetings
    const totalMeetings = await query('SELECT COUNT(*) FROM meetings');
    
    // Active meetings in period
    const activeMeetings = await query(
      'SELECT COUNT(*) FROM meetings WHERE created_at >= NOW() - INTERVAL \'$1 days\'',
      [period]
    );

    // Total participants
    const totalParticipants = await query('SELECT COUNT(*) FROM meeting_participants');

    // Average meeting duration
    const avgDuration = await query(
      'SELECT AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60) FROM meetings WHERE end_time IS NOT NULL'
    );

    // Meetings by status
    const meetingsByStatus = await query(
      'SELECT status, COUNT(*) FROM meetings GROUP BY status'
    );

    // Top meeting hosts
    const topHosts = await query(
      `SELECT u.username, COUNT(m.id) as meeting_count
       FROM users u
       JOIN meetings m ON u.id = m.host_id
       GROUP BY u.id, u.username
       ORDER BY meeting_count DESC
       LIMIT 10`
    );

    res.json({
      analytics: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        newUsers: parseInt(newUsers.rows[0].count),
        totalMeetings: parseInt(totalMeetings.rows[0].count),
        activeMeetings: parseInt(activeMeetings.rows[0].count),
        totalParticipants: parseInt(totalParticipants.rows[0].count),
        averageDuration: parseFloat(avgDuration.rows[0].avg) || 0,
        meetingsByStatus: meetingsByStatus.rows,
        topHosts: topHosts.rows
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get meeting logs
router.get('/meeting-logs', async (req, res) => {
  try {
    const { meetingId, userId, action, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    if (meetingId) {
      whereClause += `WHERE ml.meeting_id = $${paramIndex}`;
      params.push(meetingId);
      paramIndex++;
    }

    if (userId) {
      whereClause += whereClause ? ' AND' : 'WHERE';
      whereClause += ` ml.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (action) {
      whereClause += whereClause ? ' AND' : 'WHERE';
      whereClause += ` ml.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    const result = await query(
      `SELECT ml.*, u.username, u.email, m.title as meeting_title
       FROM meeting_logs ml
       JOIN users u ON ml.user_id = u.id
       JOIN meetings m ON ml.meeting_id = m.id
       ${whereClause}
       ORDER BY ml.timestamp DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      logs: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get meeting logs error:', error);
    res.status(500).json({ error: 'Failed to get meeting logs' });
  }
});

// Get all meetings
router.get('/meetings', async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    
    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    if (status) {
      whereClause = 'WHERE status = $1';
      params.push(status);
      paramIndex++;
    }

    const result = await query(
      `SELECT m.*, u.username as host_username,
              COUNT(mp.user_id) as participant_count
       FROM meetings m
       LEFT JOIN users u ON m.host_id = u.id
       LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id AND mp.left_at IS NULL
       ${whereClause}
       GROUP BY m.id, u.username
       ORDER BY m.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      meetings: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Failed to get meetings' });
  }
});

module.exports = router; 