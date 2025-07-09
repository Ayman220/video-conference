require('dotenv').config();
const { query } = require('../config/database');

const createTables = async () => {
  try {
    console.log('🔄 Starting database migration...');

    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        avatar_url VARCHAR(500),
        is_admin BOOLEAN DEFAULT FALSE,
        is_verified BOOLEAN DEFAULT FALSE,
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Create meetings table
    await query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        meeting_link VARCHAR(255) UNIQUE NOT NULL,
        host_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        duration INTEGER DEFAULT 60,
        max_participants INTEGER DEFAULT 100,
        is_recording_enabled BOOLEAN DEFAULT FALSE,
        is_chat_enabled BOOLEAN DEFAULT TRUE,
        is_screen_sharing_enabled BOOLEAN DEFAULT TRUE,
        status VARCHAR(50) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Meetings table created');

    // Create meeting_participants table
    await query(`
      CREATE TABLE IF NOT EXISTS meeting_participants (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP,
        role VARCHAR(50) DEFAULT 'participant',
        is_audio_enabled BOOLEAN DEFAULT TRUE,
        is_video_enabled BOOLEAN DEFAULT TRUE,
        UNIQUE(meeting_id, user_id)
      )
    `);
    console.log('✅ Meeting participants table created');

    // Create chat_messages table
    await query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Chat messages table created');

    // Create meeting_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS meeting_logs (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Meeting logs table created');

    // Create webrtc_signals table
    await query(`
      CREATE TABLE IF NOT EXISTS webrtc_signals (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
        from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        signal_type VARCHAR(50) NOT NULL,
        signal_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ WebRTC signals table created');

    // Create indexes for better performance
    await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await query('CREATE INDEX IF NOT EXISTS idx_meetings_host_id ON meetings(host_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_chat_messages_meeting_id ON chat_messages(meeting_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_meeting_logs_meeting_id ON meeting_logs(meeting_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_webrtc_signals_meeting_id ON webrtc_signals(meeting_id)');
    
    console.log('✅ Database indexes created');

    // Create function to update updated_at timestamp
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at
    await query(`
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await query(`
      CREATE TRIGGER update_meetings_updated_at 
        BEFORE UPDATE ON meetings 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Triggers created for updated_at columns');

    console.log('🎉 Database migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  createTables();
}

module.exports = { createTables }; 