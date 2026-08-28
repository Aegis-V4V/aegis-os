-- AEGIS OS | Postgres Intelligence Schema
-- The "Brain" of the Open Podcast Operating System

-- 1. Stream Nodes (The Feeds)
CREATE TABLE IF NOT EXISTS stream_nodes (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    title TEXT,
    image_url TEXT,
    baseline_score INTEGER DEFAULT 0,
    omni_score INTEGER DEFAULT 0,
    v4v_enabled BOOLEAN DEFAULT FALSE,
    last_reaped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Episodes (The Atoms)
CREATE TABLE IF NOT EXISTS stream_atoms (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES stream_nodes(id),
    guid TEXT,
    title TEXT,
    audio_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    semantic_vector vector(1536) -- For AI Everything Search (requires pgvector)
);

-- 3. Intelligence Links (The Tangled Web)
-- This is where we map Guest Overlaps, Economic Nodes, and Content Bridges
CREATE TABLE IF NOT EXISTS intelligence_links (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES stream_nodes(id),
    atom_id INTEGER REFERENCES stream_atoms(id),
    link_type TEXT NOT NULL, -- 'PERSON', 'VALUE_NODE', 'PODROLL', 'REFERENCE'
    link_value TEXT NOT NULL, -- The identifier (Name, LN Address, URL)
    metadata JSONB, -- Additional context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Channel Schedules (AI Radio)
CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    frequency_mhz DECIMAL(5,1)
);

CREATE TABLE IF NOT EXISTS channel_schedule (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id),
    atom_id INTEGER REFERENCES stream_atoms(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER NOT NULL
);

-- Index for the "Tangled Web" searches
CREATE INDEX IF NOT EXISTS idx_link_value ON intelligence_links(link_value);
CREATE INDEX IF NOT EXISTS idx_link_type ON intelligence_links(link_type);
