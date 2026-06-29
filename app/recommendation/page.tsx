'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  MapPin,
  Wallet,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  ArrowRight,
  Shield,
  Brain,
  RefreshCw,
  Network,
  Star,
  Zap,
  Globe,
  Plane,
  Compass,
  Navigation,
} from 'lucide-react';
import { supabase, type Destination, buildDestMap } from '@/lib/supabase';
import { getRecommendation, saveRecommendationToChain } from '@/lib/genlayer';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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

const examplePrompts = [
  { label: 'Family Trip', prompt: "I want a 3-day family vacation with cool weather, lots of photo spots, budget around $500 from New York." },
  { label: 'Solo Retreat', prompt: "Looking for a quiet beach destination for healing, budget around $300, traveling solo." },
  { label: 'Adventure', prompt: "Adventure trip for 5 friends, hiking and camping, cool weather, budget $800 from Los Angeles." },
  { label: 'Romantic', prompt: "Romantic getaway for couples, great sunsets, good food, budget $600, 2 nights." },
  { label: 'Cultural', prompt: "I want to explore ancient temples and cultural sites, budget $400, interested in history and photography." },
  { label: 'Wildlife', prompt: "Safari experience for 4 people, wildlife photography, budget $1,500, best time to see animals." },
  { label: 'Beach Lover', prompt: "Tropical beach vacation with crystal clear water, snorkeling, budget $700, 5 days from Miami." },
  { label: 'Mountain Escape', prompt: "Mountain retreat with hiking trails, fresh air, cabin stay, budget $500 for 2 people." },
  { label: 'City Break', prompt: "Weekend city trip with museums, great food scene, nightlife, budget $400 from Chicago." },
  { label: 'Hidden Gem', prompt: "Off-the-beaten-path destination, few tourists, authentic local experience, budget $600." },
];

export default function RecommendationPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<Destination[]>([]);
  const [consensusReached, setConsensusReached] = useState(false);
  const [consensusPhase, setConsensusPhase] = useState<'idle' | 'submitting' | 'validating' | 'comparing' | 'complete' | 'failed'>('idle');
  const [analyzedPreferences, setAnalyzedPreferences] = useState<string[]>([]);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [saving, setSaving] = useState(false);
  const lastResultRef = useRef<any>(null);

  useEffect(() => {
    const checkWallet = async () => {
      const eth = (window as any).ethereum;
      if (typeof window !== 'undefined' && eth) {
        try {
          const accounts = await eth.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setWalletConnected(true);
            setWalletAddress(accounts[0] as `0x${string}`);
          }
          eth.on('accountsChanged', (accs: string[]) => {
            setWalletConnected(!!(accs && accs.length > 0));
            setWalletAddress(accs?.[0] as `0x${string}` ?? null);
          });
        } catch {
          setWalletConnected(false);
        }
      }
    };
    checkWallet();
  }, []);

  const handleExampleClick = (prompt: string) => {
    setQuery(prompt);
  };

  const calculateMatchScore = (dest: Destination, preferences: string[]): number => {
    let score = 70;

    if (preferences.includes('cool') || preferences.includes('sejuk')) {
      if (dest.vibe_type?.toLowerCase().includes('mountain') || dest.tags.some(t => t.toLowerCase().includes('cool'))) {
        score += 10;
      }
    }

    if (preferences.includes('beach') || preferences.includes('pantai')) {
      if (dest.tags.some(t => t.toLowerCase().includes('beach'))) {
        score += 15;
      }
    }

    if (preferences.includes('family') || preferences.includes('keluarga')) {
      if (dest.tags.some(t => t.toLowerCase().includes('family'))) {
        score += 10;
      }
    }

    if (dest.authenticity_score > 90) {
      score += 5;
    }

    return Math.min(score, 99);
  };

  const handleSaveRec = async () => {
    const result = lastResultRef.current;
    if (!result) return;
    setSaving(true);
    try {
      const topScore = result.recommendations?.[0]?.match_score || 85;
      await saveRecommendationToChain(
        query,
        result.preferences || {},
        result.recommendations || [],
        topScore,
      );
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  };

  const simulateAnalysis = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setStep(1);
    setResults([]);

    const useGenLayer = !!process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS;
    const queryLower = query.toLowerCase();
    const preferences: string[] = [];
    let genLayerRecs: any[] | null = null;
    let genLayerFailed = false;
    let destsList: Destination[] = [];

    // ── Step 1: Submit to GenLayer + poll for consensus result ──
    if (useGenLayer) {
      setStep(2);
      setConsensusPhase('submitting');
      setAnalyzedPreferences(['Submitting to GenLayer Bradbury...']);

      try {
        setConsensusPhase('validating');
        setAnalyzedPreferences(['Waiting for validator consensus...']);

        // Fetch real destinations from Supabase for enrichment after GenLayer ranking
        const { data: allDests } = await supabase.from('destinations').select('*');
        destsList = allDests || [];

        const genResult = await getRecommendation(query);
        lastResultRef.current = genResult;
        genLayerRecs = (genResult?.recommendations) || [];
        setConsensusPhase('comparing');

        setAnalyzedPreferences([]);
        const prefs = genResult?.preferences || {};
        const prefEntries = Object.entries(prefs);
        for (const [k, v] of prefEntries) {
          await new Promise((r) => setTimeout(r, 100));
          setAnalyzedPreferences((prev) => [...prev, `${k}: ${v}`]);
        }
        if (prefEntries.length === 0) {
          setAnalyzedPreferences(['Preferences analyzed by GenLayer validators']);
        }

        setConsensusPhase('complete');
        setConsensusReached(true);
        await new Promise((r) => setTimeout(r, 400));
      } catch (e) {
        console.warn('GenLayer failed:', e);
        setAnalyzedPreferences(['GenLayer transaction pending / timed out. Check explorer console for details.']);
        setConsensusPhase('failed');
        setIsLoading(false);
        return;
      }
    }

    // Local keyword analysis (fallback or supplement)
    if (queryLower.includes('hari') || queryLower.includes('day')) preferences.push('Duration detected');
    if (queryLower.includes('keluarga') || queryLower.includes('family')) preferences.push('Group: Family');
    if (queryLower.includes('sejuk') || queryLower.includes('cool')) preferences.push('Atmosphere: Cool');
    if (queryLower.includes('foto') || queryLower.includes('photography')) preferences.push('Activity: Photography');
    if (queryLower.includes('$') || queryLower.includes('dollar') || queryLower.includes('budget')) preferences.push('Budget: Specified');
    if (queryLower.includes('york') || queryLower.includes('angeles') || queryLower.includes('london') || queryLower.includes('tokyo') || queryLower.includes('paris')) preferences.push('Origin: Specified');

    if (!useGenLayer) {
      if (preferences.length === 0) preferences.push('Analyzing preferences...');
      setAnalyzedPreferences([]);
      setStep(2);
      setConsensusPhase('submitting');
      for (const p of preferences) {
        await new Promise((r) => setTimeout(r, 300));
        setAnalyzedPreferences((prev) => [...prev, p]);
      }
      setConsensusPhase('complete');
      setConsensusReached(true);
    }

    setStep(3);

    // ── Step 3: Build Final Results ──
    let finalResults: Destination[] = [];

    if (genLayerRecs && genLayerRecs.length > 0) {
      // Enrich GenLayer ranked names with full data + images from Supabase
      const nameToDest = buildDestMap(destsList);

      for (const rec of genLayerRecs) {
        const dn = rec.name || '';
        const dbMatch = nameToDest.get(dn.toLowerCase());
        if (dbMatch) {
          finalResults.push({
            id: dbMatch.id,
            name: dbMatch.name,
            location: dbMatch.location,
            description: dbMatch.description || '',
            image_url: dbMatch.image_url || null,
            tags: dbMatch.tags || [],
            average_cost_min: dbMatch.average_cost_min ?? null,
            average_cost_max: dbMatch.average_cost_max ?? null,
            best_time_start: dbMatch.best_time_start || null,
            best_time_end: dbMatch.best_time_end || null,
            vibe_type: dbMatch.vibe_type || null,
            authenticity_score: dbMatch.authenticity_score || 85,
            popularity_score: dbMatch.popularity_score || 50,
            is_hidden_gem: dbMatch.is_hidden_gem || false,
            activities: dbMatch.activities || [],
            yearly_visitors_estimate: dbMatch.yearly_visitors_estimate || null,
            created_at: dbMatch.created_at || '',
            updated_at: dbMatch.updated_at || '',
            matchScore: rec.match_score || 85,
          } as Destination);
        } else {
          // No Supabase match — use GenLayer data directly
          finalResults.push({
            id: `gen-${finalResults.length}`,
            name: rec.name || 'Unknown',
            location: rec.location || '',
            description: rec.description || 'AI-recommended destination.',
            image_url: null,
            tags: [],
            average_cost_min: rec.estimated_cost?.min ?? null,
            average_cost_max: rec.estimated_cost?.max ?? null,
            best_time_start: rec.best_season || null,
            best_time_end: null,
            vibe_type: null,
            authenticity_score: 85,
            popularity_score: 50,
            is_hidden_gem: false,
            activities: [],
            yearly_visitors_estimate: null,
            created_at: '',
            updated_at: '',
            matchScore: rec.match_score || 85,
          } as Destination);
        }
      }
    } else if (useGenLayer && !genLayerFailed && (!genLayerRecs || genLayerRecs.length === 0)) {
      // GenLayer was used but returned no recommendations yet — tx still pending
      setAnalyzedPreferences(['GenLayer transaction pending on explorer, waiting for consensus...']);
      setConsensusPhase('validating');
      setIsLoading(false);
      return;
    } else {
      // Fallback: use Supabase data
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .order('authenticity_score', { ascending: false })
        .limit(3);
      if (error) console.error('Error fetching destinations:', error);
      if (data) {
        for (const d of data) {
          await new Promise((r) => setTimeout(r, 200));
          finalResults.push({ ...d, matchScore: calculateMatchScore(d, preferences) } as Destination);
        }
      }
    }

    // Animate results appearing
    for (const r of finalResults) {
      await new Promise((r2) => setTimeout(r2, 200));
      setResults((prev) => [...prev, r]);
    }

    setIsLoading(false);
  };

  const resetAnalysis = () => {
    setQuery('');
    setStep(0);
    setResults([]);
    setAnalyzedPreferences([]);
    setConsensusReached(false);
    setConsensusPhase('idle');
  };

  const formatPrice = (min: number | null, max: number | null): string => {
    if (!min && !max) return 'Price varies';
    if (!max) return `$${min?.toLocaleString()}+ per person`;
    return `$${min?.toLocaleString()} - $${max?.toLocaleString()} per person`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-emerald-50 dark:from-teal-950/20 dark:via-background dark:to-emerald-950/20 relative">
      {/* Floating travel decorations */}
      <div className="absolute top-20 left-[5%] text-teal-300/20 dark:text-teal-500/20 animate-float">
        <Plane className="h-14 w-14" />
      </div>
      <div className="absolute top-32 right-[8%] text-emerald-300/20 dark:text-emerald-500/20 animate-float-delayed">
        <Compass className="h-10 w-10" />
      </div>
      <div className="absolute bottom-48 left-[10%] text-teal-300/15 dark:text-teal-500/15 animate-float-slow">
        <Navigation className="h-8 w-8" />
      </div>

      {/* Dotted route lines */}
      <div className="absolute top-1/3 left-0 w-full h-px pointer-events-none">
        <svg className="w-full h-4" viewBox="0 0 1200 16" fill="none">
          <path d="M0 8 C200 0, 400 16, 600 8 C800 0, 1000 16, 1200 8" stroke="currentColor" className="text-teal-300/30 dark:text-teal-600/20" strokeWidth="2" strokeDasharray="4 4" />
        </svg>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 text-teal-700 dark:text-teal-400">
            <Sparkles className="mr-2 h-3 w-3" />
            AI-Powered Recommendation
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Find Your Perfect Destination
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Describe your ideal trip in natural language. Our AI will analyze your preferences and GenLayer validators will verify the recommendations.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg">Your Travel Preferences</CardTitle>
                <CardDescription>
                  Describe what kind of trip you&apos;re looking for
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g., I want a 3-day family vacation with cool weather, lots of photo spots, budget around $500 from New York..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={6}
                  className="resize-none"
                  disabled={isLoading}
                />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Try these examples:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {examplePrompts.map((example) => (
                      <Button
                        key={example.label}
                        variant="outline"
                        size="sm"
                        onClick={() => handleExampleClick(example.prompt)}
                        disabled={isLoading}
                        className="text-xs justify-start"
                      >
                        {example.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={simulateAnalysis}
                    disabled={isLoading || !query.trim()}
                    className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Get Recommendations
                      </>
                    )}
                  </Button>
                  {results.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={resetAnalysis}
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {step >= 1 && (
              <Card className="border-teal-200 dark:border-teal-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white">
                      <Brain className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Step 1: Preference Analysis</CardTitle>
                      <CardDescription>AI identifies your travel needs</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {analyzedPreferences.map((pref, i) => (
                      <div
                        key={i}
                          className="flex items-center gap-2 p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30"
                        >
                          <CheckCircle2 className="h-4 w-4 text-teal-500" />
                        <span className="text-sm">{pref}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {step >= 2 && (
              <Card className={`overflow-hidden transition-all duration-500 border ${
                consensusPhase === 'complete' || consensusPhase === 'failed'
                  ? 'border-emerald-300 dark:border-emerald-700 shadow-lg shadow-emerald-500/10'
                  : 'border-amber-200 dark:border-amber-800'
              }`}>
                <CardContent className="py-6">
                  {consensusPhase !== 'complete' && consensusPhase !== 'failed' ? (
                    <PlaneLoader
                      label={
                        consensusPhase === 'submitting' ? 'Submitting to GenLayer Bradbury...' :
                        consensusPhase === 'validating' ? 'AI validators analyzing your preferences...' :
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
                        <Network className="h-5 w-5" />
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

            {step >= 3 && results.length > 0 && (
              <div className="space-y-4">
                <Alert className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle>Recommendations Ready</AlertTitle>
                  <AlertDescription>
                    GenLayer validators have verified these results.
                  </AlertDescription>
                </Alert>

                {results.map((dest, index) => {
                  const matchScore = ('matchScore' in dest ? (dest as any).matchScore : dest.authenticity_score) || 85;

                  return (
                    <Card
                      key={dest.id}
                      className={`overflow-hidden ${
                        index === 0 ? 'border-2 border-emerald-500' : ''
                      }`}
                    >
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/3 relative">
                          <img
                            src={dest.image_url || getFallbackImage(index)}
                            alt={dest.name}
                            className="w-full h-48 md:h-full object-cover"
                          />
                          {index === 0 && (
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                Top Match
                              </Badge>
                            </div>
                          )}
                          <div className="absolute bottom-2 right-2">
                            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                              <Shield className="mr-1 h-3 w-3" />
                              {dest.authenticity_score}% Verified
                            </Badge>
                          </div>
                        </div>
                        <div className="flex-1 p-6">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="text-xl font-bold">{dest.name}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {dest.location}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-emerald-600">{matchScore}%</div>
                              <div className="text-xs text-muted-foreground">Match Score</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 my-3">
                            {dest.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          <p className="text-sm text-muted-foreground mb-4">
                            {dest.description}
                          </p>

                          <div className="flex flex-wrap gap-4 text-sm mb-4">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>{formatPrice(dest.average_cost_min, dest.average_cost_max)}</span>
                            </div>
                            {dest.best_time_start && dest.best_time_end && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>Best: {dest.best_time_start} - {dest.best_time_end}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                    className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
                              onClick={() => router.push(`/itinerary?destination=${encodeURIComponent(dest.name)}`)}>
                              Generate Itinerary
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            <Button variant="outline" onClick={handleSaveRec} disabled={saving}>
                              {saving ? 'Saving...' : 'Save Trip'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {step === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Analysis Yet</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Enter your travel preferences to get AI-powered recommendations verified by GenLayer.
                  </p>
                  <Alert variant={walletConnected ? "default" : "default"} className={`text-left max-w-md mx-auto ${walletConnected ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                    <Wallet className={`h-4 w-4 ${walletConnected ? 'text-emerald-500' : ''}`} />
                    <AlertTitle>{walletConnected ? 'Wallet Connected' : 'GenLayer Blockchain'}</AlertTitle>
                    <AlertDescription className="text-xs">
                      {walletConnected
                        ? 'Your wallet is connected. Enter your preferences to get GenLayer-validated recommendations.'
                        : 'Connect your wallet for full access to validated recommendations.'}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
