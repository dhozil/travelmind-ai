-- Create destinations table
CREATE TABLE destinations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  average_cost_min INTEGER,
  average_cost_max INTEGER,
  best_time_start TEXT,
  best_time_end TEXT,
  vibe_type TEXT,
  authenticity_score INTEGER DEFAULT 0 CHECK (authenticity_score >= 0 AND authenticity_score <= 100),
  popularity_score INTEGER DEFAULT 50 CHECK (popularity_score >= 0 AND popularity_score <= 100),
  yearly_visitors_estimate TEXT,
  is_hidden_gem BOOLEAN DEFAULT FALSE,
  activities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user profiles table
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  wallet_address TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  credits_remaining INTEGER DEFAULT 3,
  plan_type TEXT DEFAULT 'explorer' CHECK (plan_type IN ('explorer', 'wanderer', 'nomad')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create saved trips table
CREATE TABLE saved_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  trip_name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  traveler_count INTEGER DEFAULT 1,
  total_budget INTEGER,
  itinerary_data JSONB,
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  is_saved_onchain BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'booked', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI recommendations history
CREATE TABLE recommendations_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  analyzed_preferences JSONB,
  recommended_destinations JSONB,
  validator_consensus_score INTEGER CHECK (validator_consensus_score >= 0 AND validator_consensus_score <= 100),
  validator_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations_history ENABLE ROW LEVEL SECURITY;

-- Policies for destinations (public read)
CREATE POLICY "destinations_select_public" ON destinations FOR SELECT
  TO authenticated, anon USING (true);

-- Policies for user profiles
CREATE POLICY "user_profiles_select_own" ON user_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

CREATE POLICY "user_profiles_insert_own" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_update_own" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Policies for saved trips
CREATE POLICY "saved_trips_select_own" ON saved_trips FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "saved_trips_insert_own" ON saved_trips FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_trips_update_own" ON saved_trips FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_trips_delete_own" ON saved_trips FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Policies for recommendations history
CREATE POLICY "recommendations_history_select_own" ON recommendations_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "recommendations_history_insert_own" ON recommendations_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_saved_trips_user_id ON saved_trips(user_id);
CREATE INDEX idx_saved_trips_destination_id ON saved_trips(destination_id);
CREATE INDEX idx_destinations_tags ON destinations USING GIN(tags);
CREATE INDEX idx_destinations_vibe_type ON destinations(vibe_type);
CREATE INDEX idx_destinations_is_hidden_gem ON destinations(is_hidden_gem);
CREATE INDEX idx_recommendations_history_user_id ON recommendations_history(user_id);
CREATE INDEX idx_user_profiles_wallet_address ON user_profiles(wallet_address);

-- Insert sample destinations
INSERT INTO destinations (name, location, description, image_url, tags, average_cost_min, average_cost_max, best_time_start, best_time_end, vibe_type, authenticity_score, popularity_score, yearly_visitors_estimate, is_hidden_gem, activities) VALUES
('Danau Toba', 'North Sumatra, Indonesia', 'The largest volcanic lake in the world, offering breathtaking views, cool weather, and rich Batak culture.', 'https://images.pexels.com/photos/2161467/pexels-photo-2161467.jpeg', ARRAY['Nature', 'Cultural', 'Family-friendly', 'Cool Weather'], 2500000, 3500000, 'April', 'October', 'Scenic Lake', 95, 40, '~50,000', false, ARRAY['Swimming', 'Cultural tours', 'Photography', 'Hiking']),
('Pulau Weh', 'Aceh, Indonesia', 'An untouched island paradise with crystal-clear waters, world-class diving, and pristine beaches.', 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg', ARRAY['Beach', 'Diving', 'Nature', 'Hidden Gem'], 2000000, 3000000, 'March', 'November', 'Tropical Paradise', 90, 25, '~10,000', true, ARRAY['Diving', 'Snorkeling', 'Beach', 'Relaxation']),
('Karimunjawa', 'Central Java, Indonesia', 'A hidden archipelago with pristine beaches, vibrant coral reefs, and a relaxed island atmosphere.', 'https://images.pexels.com/photos/17078916/pexels-photo-17078916.jpeg', ARRAY['Beach', 'Island', 'Snorkeling', 'Relaxation'], 2200000, 2800000, 'April', 'October', 'Island Life', 88, 35, '~20,000', false, ARRAY['Snorkeling', 'Island hopping', 'Beach camping', 'Photography']),
('Raja Ampat', 'West Papua, Indonesia', 'A premier diving destination with the highest recorded marine biodiversity on Earth.', 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg', ARRAY['Diving', 'Nature', 'Luxury', 'Adventure'], 8000000, 15000000, 'October', 'April', 'Diving Paradise', 92, 55, '~15,000', false, ARRAY['Diving', 'Snorkeling', 'Kayaking', 'Photography']),
('Komodo Island', 'East Nusa Tenggara, Indonesia', 'Home to the legendary Komodo dragons and stunning landscapes.', 'https://images.pexels.com/photos/17078916/pexels-photo-17078916.jpeg', ARRAY['Wildlife', 'Adventure', 'Unique', 'Nature'], 4000000, 8000000, 'April', 'November', 'Adventure', 85, 60, '~200,000', false, ARRAY['Dragon spotting', 'Hiking', 'Snorkeling', 'Photography']),
('Pulau Banyak', 'Aceh Singkil, Indonesia', 'An untouched archipelago with pristine beaches and zero crowds.', 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg', ARRAY['Beach', 'Islands', 'Relaxation', 'Hidden Gem'], 2000000, 4000000, 'March', 'October', 'Untouched Paradise', 98, 15, '<1,000', true, ARRAY['Snorkeling', 'Fishing', 'Beach camping', 'Wildlife watching']),
('Kampung Naga', 'Tasikmalaya, West Java', 'A traditional Sundanese village frozen in time with no electricity.', 'https://images.pexels.com/photos/2161467/pexels-photo-2161467.jpeg', ARRAY['Cultural', 'Village', 'Traditional'], 500000, 1000000, 'January', 'December', 'Cultural Heritage', 97, 32, '~5,000', true, ARRAY['Cultural immersion', 'Traditional crafts', 'Local cuisine', 'Village stay']);
