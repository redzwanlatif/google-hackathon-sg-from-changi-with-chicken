-- TiDB Schema for "The Chicken Must Arrive"
-- Player DNA + Soul Twins Feature

-- ============================================
-- CORE TABLES
-- ============================================

-- Player sessions (one per game playthrough)
CREATE TABLE IF NOT EXISTS player_sessions (
  id VARCHAR(36) PRIMARY KEY,
  nickname VARCHAR(100),
  chicken_name VARCHAR(100),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  ending VARCHAR(20), -- 'perfect', 'good', 'okay', 'timeout', 'chicken-lost', 'broke'
  final_time_remaining INT,
  final_money INT,
  final_chicken_mood INT,
  memories_unlocked INT DEFAULT 0,
  locations_visited JSON, -- ["changi", "maxwell", ...]
  INDEX idx_ended (ended_at),
  INDEX idx_ending (ending)
);

-- Player events (every significant action)
CREATE TABLE IF NOT EXISTS player_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'npc_talk', 'travel', 'quest_complete', 'emotion', 'chicken_pet', etc.
  event_data JSON, -- Flexible data per event type
  location VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id),
  INDEX idx_type (event_type),
  INDEX idx_session_type (session_id, event_type)
);

-- NPC conversations (for Singlish corpus + gossip)
CREATE TABLE IF NOT EXISTS npc_conversations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  npc_id VARCHAR(50) NOT NULL,
  player_message TEXT,
  npc_response TEXT,
  player_sentiment FLOAT, -- -1 to 1
  laugh_detected BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id),
  INDEX idx_npc (npc_id)
);

-- Player emotions timeline
CREATE TABLE IF NOT EXISTS emotion_timeline (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  emotion VARCHAR(30), -- 'happy', 'stressed', 'confused', 'laughing', etc.
  confidence FLOAT,
  trigger_event VARCHAR(100), -- What caused this emotion
  location VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id),
  INDEX idx_emotion (emotion)
);

-- ============================================
-- PLAYER DNA (Vector Embeddings)
-- ============================================

-- Player DNA profiles (generated at end of game)
CREATE TABLE IF NOT EXISTS player_dna (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) UNIQUE NOT NULL,
  nickname VARCHAR(100),
  chicken_name VARCHAR(100),

  -- DNA embedding (384 dimensions for all-MiniLM-L6-v2)
  -- TiDB supports VECTOR type for similarity search
  dna_embedding VECTOR(384),

  -- Derived traits (for display)
  player_type VARCHAR(50), -- 'The Chicken Whisperer', 'The Speedrunner', etc.
  traits JSON, -- ["singlish_master", "patient", "funny"]

  -- Stats summary
  total_laughs INT DEFAULT 0,
  total_conversations INT DEFAULT 0,
  avg_chicken_mood FLOAT,
  singlish_fluency FLOAT, -- 0-100
  emotional_range JSON, -- ["stressed", "happy", "triumphant"]

  -- Journey summary
  ending VARCHAR(20),
  completion_time INT, -- seconds taken
  locations_visited INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Vector index for similarity search (cosine distance)
  VECTOR INDEX idx_dna_embedding ((VEC_COSINE_DISTANCE(dna_embedding))) USING HNSW
);

-- ============================================
-- AGGREGATES (for live dashboard)
-- ============================================

-- Chicken Hall of Fame
CREATE TABLE IF NOT EXISTS chicken_leaderboard (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) UNIQUE NOT NULL,
  chicken_name VARCHAR(100) NOT NULL,
  final_mood INT,
  player_nickname VARCHAR(100),
  ending VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mood (final_mood DESC)
);

-- Trending Singlish phrases
CREATE TABLE IF NOT EXISTS singlish_phrases (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  phrase VARCHAR(500),
  english_meaning TEXT,
  context VARCHAR(100), -- 'greeting', 'apology', 'exclamation', etc.
  usage_count INT DEFAULT 1,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_phrase (phrase(100)),
  INDEX idx_count (usage_count DESC)
);

-- Location emotional heatmap (aggregated)
CREATE TABLE IF NOT EXISTS location_emotions (
  location VARCHAR(50) NOT NULL,
  emotion VARCHAR(30) NOT NULL,
  count INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (location, emotion)
);

-- ============================================
-- HELPER VIEWS
-- ============================================

-- Soul Twins finder (example query - run in app)
-- SELECT session_id, nickname, chicken_name, player_type,
--        VEC_COSINE_DISTANCE(dna_embedding, @my_embedding) as similarity
-- FROM player_dna
-- WHERE session_id != @my_session
-- ORDER BY similarity ASC
-- LIMIT 5;

-- Chicken name trends
-- SELECT chicken_name, COUNT(*) as count
-- FROM player_sessions
-- WHERE chicken_name IS NOT NULL
-- GROUP BY chicken_name
-- ORDER BY count DESC
-- LIMIT 10;
