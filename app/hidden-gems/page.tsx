'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Gem,
  MapPin,
  Users,
  DollarSign,
  Loader2,
  Sparkles,
  CheckCircle2,
  Eye,
  Clock,
  Shield,
  Star,
  ArrowRight,
  Filter,
  Search,
  Shuffle,
  Compass,
  Navigation,
} from 'lucide-react';
import { supabase, type Destination, buildDestMap } from '@/lib/supabase';
import { findHiddenGems } from '@/lib/genlayer';
import PlaneLoader from '@/components/ui/plane-loader';

const fallbackImages = [
  'https://images.pexels.com/photos/2161467/pexels-photo-2161467.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2387871/pexels-photo-2387871.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2090645/pexels-photo-2090645.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1005417/pexels-photo-1005417.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1898155/pexels-photo-1898155.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1486970/pexels-photo-1486970.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3614418/pexels-photo-3614418.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1167025/pexels-photo-1167025.jpeg?auto=compress&cs=tinysrgb&w=800',
];

const getFallbackImage = (index: number) => fallbackImages[index % fallbackImages.length];

const getPopularityLabel = (score: number) => {
  if (score < 20) return { label: 'Very Hidden', variant: 'default' } as const;
  if (score < 40) return { label: 'Hidden Gem', variant: 'secondary' } as const;
  if (score < 60) return { label: 'Emerging', variant: 'outline' } as const;
  return { label: 'Moderate', variant: 'outline' } as const;
};

export default function HiddenGemsPage() {
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('all');
  const [budgetMax, setBudgetMax] = useState('any');
  const [isLoading, setIsLoading] = useState(false);
  const [gems, setGems] = useState<Destination[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [consensusPhase, setConsensusPhase] = useState<'idle' | 'submitting' | 'validating' | 'comparing' | 'complete' | 'failed'>('idle');
  const lastGemsRef = useRef<any>(null);

  const searchGems = async () => {
    setIsLoading(true);
    setHasSearched(true);
    setConsensusPhase('submitting');

    try {
      // Fetch real hidden gems from Supabase for enrichment after GenLayer ranking
      const { data: gems } = await supabase
        .from('destinations')
        .select('*')
        .eq('is_hidden_gem', true)
        .order('popularity_score', { ascending: true })
        .limit(20);

      setConsensusPhase('validating');
      const result = await findHiddenGems(
        filter || 'hidden authentic destinations',
        budgetMax !== 'any' ? parseInt(budgetMax) : 0,
        category !== 'all' ? category : 'any',
        10,
      );

      const gemsList = result?.hidden_gems || [];

      if (gemsList.length === 0 && process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS) {
        setConsensusPhase('failed');
        setIsLoading(false);
        return;
      }

      lastGemsRef.current = result;
      setConsensusPhase('complete');

      const nameToGem = buildDestMap(gems || []);
      setGems(gemsList.map((g: any, i: number) => {
        const full = nameToGem.get((g.name || '').toLowerCase());
        if (!full) return null;
        return {
          id: full.id,
          name: full.name,
          location: full.location,
          description: full.description || '',
          image_url: full.image_url || null,
          tags: full.tags || [],
          average_cost_min: full.average_cost_min ?? null,
          average_cost_max: full.average_cost_max ?? null,
          best_time_start: full.best_time_start || null,
          best_time_end: full.best_time_end || null,
          vibe_type: full.vibe_type || null,
          authenticity_score: full.authenticity_score || g.hidden_score || 85,
          popularity_score: full.popularity_score || 50,
          is_hidden_gem: true,
          activities: full.activities || [],
          yearly_visitors_estimate: full.yearly_visitors_estimate || null,
          created_at: full.created_at || '',
          updated_at: full.updated_at || '',
        };
      }).filter((x: any): x is Destination => x != null));
    } catch (e) {
      console.error('Failed to find hidden gems:', e);
      setConsensusPhase('failed');
      setGems([]);
    }

    setIsLoading(false);
  };

  const randomDiscovery = async () => {
    setIsLoading(true);
    setHasSearched(true);

    const { data } = await supabase
      .from('destinations')
      .select('*')
      .order('authenticity_score', { ascending: false });

    if (data && data.length > 0) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setGems(shuffled.slice(0, 6));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadInitialGems();
  }, []);

  const loadInitialGems = async () => {
    setIsLoading(true);
    setHasSearched(true);
    setConsensusPhase('submitting');

    const useGenLayer = !!process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS;

    if (useGenLayer) {
      try {
        setConsensusPhase('validating');
        const result = await findHiddenGems('authentic hidden destinations', 0, 'any', 6);
        const gemsList = result?.hidden_gems || [];

        if (gemsList.length > 0) {
          const { data: gems } = await supabase
            .from('destinations')
            .select('*')
            .eq('is_hidden_gem', true)
            .order('popularity_score', { ascending: true })
            .limit(20);

          lastGemsRef.current = result;
          setConsensusPhase('complete');

          const nameToGem = buildDestMap(gems || []);
          setGems(gemsList.map((g: any) => {
            const full = nameToGem.get((g.name || '').toLowerCase());
            if (!full) return null;
            return {
              id: full.id, name: full.name, location: full.location,
              description: full.description || '', image_url: full.image_url || null,
              tags: full.tags || [], average_cost_min: full.average_cost_min ?? null,
              average_cost_max: full.average_cost_max ?? null,
              best_time_start: full.best_time_start || null,
              best_time_end: full.best_time_end || null,
              vibe_type: full.vibe_type || null,
              authenticity_score: full.authenticity_score || g.hidden_score || 85,
              popularity_score: full.popularity_score || 50,
              is_hidden_gem: true, activities: full.activities || [],
              yearly_visitors_estimate: full.yearly_visitors_estimate || null,
              created_at: full.created_at || '', updated_at: full.updated_at || '',
            } as Destination;
          }).filter((x: any): x is Destination => x != null));
          setIsLoading(false);
          return;
        }
      } catch {
        // fall through to Supabase fallback
      }
    }

    // Fallback: load from Supabase
    const { data } = await supabase
      .from('destinations')
      .select('*')
      .eq('is_hidden_gem', true)
      .order('popularity_score', { ascending: true })
      .limit(6);
    if (data) setGems(data);
    setConsensusPhase('idle');
    setIsLoading(false);
  };

  const formatPrice = (min: number | null, max: number | null): string => {
    if (!min && !max) return 'Price varies';
    if (!max) return `$${min?.toLocaleString()}+ per person`;
    return `$${min?.toLocaleString()} - $${max?.toLocaleString()} per person`;
  };

  const displayGems = gems.sort((a, b) => a.popularity_score - b.popularity_score);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-emerald-50 dark:from-teal-950/20 dark:via-background dark:to-emerald-950/20 relative">
      {/* Floating travel decorations */}
      <div className="absolute top-20 right-[12%] text-teal-300/20 dark:text-teal-500/20 animate-float">
        <Compass className="h-14 w-14" />
      </div>
      <div className="absolute top-36 left-[8%] text-emerald-300/20 dark:text-emerald-500/20 animate-float-delayed">
        <MapPin className="h-12 w-12" />
      </div>
      <div className="absolute bottom-44 right-[8%] text-teal-300/15 dark:text-teal-500/15 animate-float-slow">
        <Navigation className="h-8 w-8" />
      </div>

      {/* Dotted route lines */}
      <div className="absolute top-1/4 left-0 w-full h-px pointer-events-none">
        <svg className="w-full h-4" viewBox="0 0 1200 16" fill="none">
          <path d="M0 8 C250 16, 500 0, 750 8 C1000 16, 1100 0, 1200 8" stroke="currentColor" className="text-teal-300/30 dark:text-teal-600/20" strokeWidth="2" strokeDasharray="3 6" />
        </svg>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-400">
            <Gem className="mr-2 h-3 w-3" />
            Hidden Gem Finder
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Discover Places Before They Go Viral
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover unique, uncrowded destinations. Use Random Discovery for quick inspiration, or AI Search for personalized recommendations.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Find Your Gems
                </CardTitle>
                <CardDescription>
                  Customize your hidden gem discovery
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Location or name..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Beach">Beach & Islands</SelectItem>
                      <SelectItem value="Waterfall">Waterfalls</SelectItem>
                      <SelectItem value="Cultural">Cultural Sites</SelectItem>
                      <SelectItem value="Nature">Nature & Lakes</SelectItem>
                      <SelectItem value="Wildlife">Wildlife</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Budget</label>
                  <Select value={budgetMax} onValueChange={setBudgetMax}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Budget</SelectItem>
                      <SelectItem value="500">Under $500</SelectItem>
                      <SelectItem value="1000">Under $1,000</SelectItem>
                      <SelectItem value="2000">Under $2,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={searchGems}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Find Hidden Gems
                    </>
                  )}
                </Button>

                <Button
                  onClick={randomDiscovery}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <Shuffle className="mr-2 h-4 w-4" />
                  Random Discovery
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {isLoading && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardContent className="py-6">
                  {consensusPhase !== 'complete' && consensusPhase !== 'failed' ? (
                    <PlaneLoader
                      label={
                        consensusPhase === 'submitting' ? 'Submitting to GenLayer Bradbury...' :
                        consensusPhase === 'validating' ? 'AI validators searching for hidden gems...' :
                        consensusPhase === 'comparing' ? 'Validating via EqNonComparative...' :
                        'Processing...'
                      }
                    />
                  ) : consensusPhase === 'complete' ? (
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">Consensus Reached</p>
                        <p className="text-sm text-muted-foreground">Validators agreed on-chain — result verified</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0">
                        <Gem className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">Transaction Pending</p>
                        <p className="text-sm text-muted-foreground">Check explorer for finalization</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!isLoading && hasSearched && displayGems.length > 0 && (
              <>
                <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                  <Gem className="h-4 w-4 text-amber-600" />
                  <AlertTitle>{displayGems.length} Destinations Found</AlertTitle>
                  <AlertDescription>
                    These destinations are off the beaten path. Visit soon before they become popular.
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-2 gap-6">
                  {displayGems.map((gem, index) => (
                    <Card
                      key={gem.id}
                      className={`overflow-hidden group ${
                        index === 0 ? 'border-2 border-amber-500' : ''
                      }`}
                    >
                      <div className="relative aspect-video">
                        <img
                          src={gem.image_url || getFallbackImage(index)}
                          alt={gem.name}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute top-2 left-2 flex gap-2">
                          {index === 0 && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                              <Star className="mr-1 h-3 w-3 fill-current" />
                              Top Find
                            </Badge>
                          )}
                          <Badge className="bg-white/90 text-gray-900">
                            <Gem className="mr-1 h-3 w-3" />
                            {gem.popularity_score}% Hidden
                          </Badge>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2">
                          <h3 className="text-lg font-bold text-white">{gem.name}</h3>
                          <p className="text-xs text-white/80 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {gem.location}
                          </p>
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-wrap gap-1">
                          {gem.tags?.slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {gem.description}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {gem.yearly_visitors_estimate || 'Unknown'}/year
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            {formatPrice(gem.average_cost_min, gem.average_cost_max)}
                          </div>
                          {gem.best_time_start && gem.best_time_end && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {gem.best_time_start} - {gem.best_time_end}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-emerald-600">
                            <Shield className="h-3 w-3" />
                            {gem.authenticity_score}% Authentic
                          </div>
                        </div>

                        {gem.activities && gem.activities.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {gem.activities.slice(0, 4).map((activity) => (
                              <Badge key={activity} variant="outline" className="text-xs">
                                {activity}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                          View Full Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {!isLoading && hasSearched && displayGems.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Gem className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Hidden Gems Found</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Try adjusting your filters to find more destinations.
                  </p>
                </CardContent>
              </Card>
            )}

            {!hasSearched && !isLoading && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Gem className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Start Your Discovery</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Use AI to find hidden destinations that haven&apos;t gone viral yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
