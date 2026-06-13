import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Destination = {
  id: string;
  name: string;
  location: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  average_cost_min: number | null;
  average_cost_max: number | null;
  best_time_start: string | null;
  best_time_end: string | null;
  vibe_type: string | null;
  authenticity_score: number;
  popularity_score: number;
  yearly_visitors_estimate: string | null;
  is_hidden_gem: boolean;
  activities: string[];
  created_at: string;
  updated_at: string;
};

export type SavedTrip = {
  id: string;
  user_id: string;
  destination_id: string | null;
  trip_name: string;
  start_date: string | null;
  end_date: string | null;
  traveler_count: number;
  total_budget: number | null;
  itinerary_data: any;
  match_score: number | null;
  is_saved_onchain: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  id: string;
  wallet_address: string | null;
  display_name: string | null;
  avatar_url: string | null;
  credits_remaining: number;
  plan_type: string;
  created_at: string;
  updated_at: string;
};

export async function getDestinations(options?: {
  limit?: number;
  isHiddenGem?: boolean;
  tags?: string[];
  minBudget?: number;
  maxBudget?: number;
}): Promise<Destination[]> {
  let query = supabase.from('destinations').select('*');

  if (options?.isHiddenGem !== undefined) {
    query = query.eq('is_hidden_gem', options.isHiddenGem);
  }

  if (options?.tags && options.tags.length > 0) {
    query = query.contains('tags', options.tags);
  }

  if (options?.minBudget) {
    query = query.gte('average_cost_max', options.minBudget);
  }

  if (options?.maxBudget) {
    query = query.lte('average_cost_min', options.maxBudget);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.order('popularity_score', { ascending: true });

  if (error) {
    console.error('Error fetching destinations:', error);
    return [];
  }

  return data || [];
}

export async function getDestinationById(id: string): Promise<Destination | null> {
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching destination:', error);
    return null;
  }

  return data;
}

export async function searchDestinations(query: string): Promise<Destination[]> {
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .or(`name.ilike.%${query}%,location.ilike.%${query}%,description.ilike.%${query}%`);

  if (error) {
    console.error('Error searching destinations:', error);
    return [];
  }

  return data || [];
}

export async function getHiddenGems(limit: number = 10): Promise<Destination[]> {
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('is_hidden_gem', true)
    .order('popularity_score', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching hidden gems:', error);
    return [];
  }

  return data || [];
}

export async function getTopDestinations(limit: number = 6): Promise<Destination[]> {
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .order('authenticity_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top destinations:', error);
    return [];
  }

  return data || [];
}
