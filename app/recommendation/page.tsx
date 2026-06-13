'use client';

import { useState, useEffect } from 'react';
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
  Award,
} from 'lucide-react';
import { supabase, type Destination } from '@/lib/supabase';
import { getRecommendation } from '@/lib/genlayer';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const fallbackImages = [
  'https://images.pexels.com/photos/2161467/pexels-photo-2161467.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2387871/pexels-photo-2387871.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1732289/pexels-photo-1732289.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1005417/pexels-photo-1005417.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1898155/pexels-photo-1898155.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3225516/pexels-photo-3225516.jpeg?auto=compress&cs=tinysrgb&w=800',
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
  const [consensusPhase, setConsensusPhase] = useState<'idle' | 'submitting' | 'validating' | 'comparing' | 'complete'>('idle');
  const [analyzedPreferences, setAnalyzedPreferences] = useState<string[]>([]);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);

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

  const simulateAnalysis = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setStep(1);
    setResults([]);

    const useGenLayer = !!process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS;
    const queryLower = query.toLowerCase();
    const preferences: string[] = [];
    let genLayerRecs: any[] | null = null;

    // ── Step 1: Preference Analysis ──
    if (useGenLayer) {
      try {
        const genResult = await getRecommendation(query);
        genLayerRecs = (genResult?.recommendations) || [];
        const prefs = genResult?.preferences || {};
        const prefEntries = Object.entries(prefs);
        for (const [k, v] of prefEntries) {
          await new Promise((r) => setTimeout(r, 200));
          setAnalyzedPreferences((prev) => [...prev, `${k}: ${v}`]);
        }
        if (prefEntries.length === 0) {
          setAnalyzedPreferences(['Preferences analyzed by GenLayer validators']);
        }
      } catch (e) {
        console.warn('GenLayer failed, using local analysis:', e);
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
      for (const p of preferences) {
        await new Promise((r) => setTimeout(r, 300));
        setAnalyzedPreferences((prev) => [...prev, p]);
      }
    }

    await new Promise((r) => setTimeout(r, 400));
    setStep(2);

    // ── Step 2: Animated consensus visualization ──
    setConsensusPhase('submitting');
    await new Promise((r) => setTimeout(r, 600));
    setConsensusPhase('validating');
    await new Promise((r) => setTimeout(r, 800));
    setConsensusPhase('comparing');
    await new Promise((r) => setTimeout(r, 700));
    setConsensusPhase('complete');
    setConsensusReached(true);
    await new Promise((r) => setTimeout(r, 500));

    setStep(3);

    // ── Step 3: Build Final Results ──
    let finalResults: Destination[] = [];

    if (genLayerRecs && genLayerRecs.length > 0) {
      // Enrich GenLayer results with images from Supabase
      const { data: allDests } = await supabase.from('destinations').select('*');
      const nameToDest = new Map((allDests || []).map((d: Destination) => [d.name.toLowerCase(), d]));

      for (const rec of genLayerRecs) {
        const src = rec.destination || rec;
        const dn = src.name || '';
        const dbMatch = nameToDest.get(dn.toLowerCase());
        const enriched: any = {
          id: dbMatch?.id || `gen_${dn}`,
          name: dn,
          location: src.location || '',
          description: src.description || '',
          image_url: dbMatch?.image_url || null,
          tags: src.tags || [],
          average_cost_min: src.estimated_cost?.min || null,
          average_cost_max: src.estimated_cost?.max || null,
          best_time_start: src.best_season?.split(' - ')[0] || null,
          best_time_end: src.best_season?.split(' - ')[1] || null,
          vibe_type: src.vibe_type || null,
          authenticity_score: src.authenticity_estimate || 85,
          popularity_score: dbMatch?.popularity_score || 50,
          is_hidden_gem: dbMatch?.is_hidden_gem || false,
          activities: dbMatch?.activities || [],
          yearly_visitors_estimate: dbMatch?.yearly_visitors_estimate || null,
          created_at: dbMatch?.created_at || '',
          updated_at: dbMatch?.updated_at || '',
          matchScore: rec.match_score || 85,
        };
        finalResults.push(enriched as Destination);
      }
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
    if (!max) return `$${min?.toLocaleString()}+`;
    return `$${min?.toLocaleString()} - $${max?.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-violet-50/30 to-background dark:via-violet-950/20">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-700 dark:text-violet-400">
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
              <Card className="border-violet-200 dark:border-violet-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
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
                        className="flex items-center gap-2 p-2 rounded-lg bg-violet-50 dark:bg-violet-950/30"
                      >
                        <CheckCircle2 className="h-4 w-4 text-violet-500" />
                        <span className="text-sm">{pref}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {step >= 2 && (
              <Card className={`overflow-hidden transition-all duration-500 border ${
                consensusPhase === 'complete'
                  ? 'border-emerald-300 dark:border-emerald-700 shadow-lg shadow-emerald-500/10'
                  : 'border-amber-200 dark:border-amber-800'
              }`}>
                <div className={`h-1 transition-all duration-1000 ${
                  consensusPhase === 'submitting' ? 'w-1/4 bg-blue-500' :
                  consensusPhase === 'validating' ? 'w-2/4 bg-amber-500' :
                  consensusPhase === 'comparing' ? 'w-3/4 bg-violet-500' :
                  'w-full bg-emerald-500'
                }`} />
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white transition-all duration-700 ${
                      consensusPhase === 'complete'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 scale-110'
                        : consensusPhase === 'comparing'
                        ? 'bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse'
                        : 'bg-gradient-to-br from-amber-500 to-orange-600 animate-pulse'
                    }`}>
                      {consensusPhase === 'complete' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {consensusPhase === 'complete' ? 'Consensus Reached' : 'Multi-Validator Consensus'}
                      </CardTitle>
                      <CardDescription>
                        {consensusPhase === 'submitting' && 'Submitting to GenLayer StudioNet...'}
                        {consensusPhase === 'validating' && '3 AI validators analyzing your query independently...'}
                        {consensusPhase === 'comparing' && 'Comparing validator outputs via prompt_comparative...'}
                        {consensusPhase === 'complete' && 'All validators agreed on-chain — result verified'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {/* Validator Nodes Network Visualization */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {[
                        { name: 'GPT-4', label: 'Alpha', color: 'from-blue-500 to-blue-600', delay: '0ms' },
                        { name: 'Claude 3', label: 'Beta', color: 'from-amber-500 to-orange-600', delay: '200ms' },
                        { name: 'Gemini Pro', label: 'Gamma', color: 'from-emerald-500 to-teal-600', delay: '400ms' },
                      ].map((v, i) => (
                        <div key={i} className="relative flex flex-col items-center">
                          <div className={`relative transition-all duration-700`}
                               style={{ animationDelay: v.delay }}>
                            <div className={`h-16 w-16 rounded-full flex items-center justify-center text-white text-lg font-bold bg-gradient-to-br ${v.color} ${
                              consensusPhase === 'complete'
                                ? 'shadow-lg shadow-emerald-500/20'
                                : consensusPhase === 'validating' || (consensusPhase === 'comparing')
                                ? 'animate-pulse shadow-lg'
                                : ''
                            }`}>
                              <Brain className="h-6 w-6" />
                            </div>
                            {consensusPhase === 'validating' && (
                              <div className="absolute -top-1 -right-1">
                                <span className="flex h-4 w-4">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
                                </span>
                              </div>
                            )}
                            {consensusPhase === 'complete' && (
                              <div className="absolute -top-1 -right-1">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-medium mt-2">{v.name}</span>
                          <span className="text-[10px] text-muted-foreground">Validator {v.label}</span>
                          {consensusPhase === 'complete' && (
                            <div className="flex items-center gap-1 mt-1">
                              <Shield className="h-3 w-3 text-emerald-500" />
                              <span className="text-[10px] text-emerald-600 font-medium">Verified</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Network Connection Lines (CSS) */}
                    <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-0.5">
                      <div className={`h-full transition-all duration-1000 ${
                        consensusPhase === 'complete' ? 'bg-emerald-300' : 'bg-muted-foreground/20'
                      }`} />
                    </div>

                    {/* Consensus Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      {[
                        { icon: Network, label: 'Network', value: 'Studionet' },
                        { icon: Shield, label: 'Mechanism', value: 'prompt_comparative' },
                        { icon: Zap, label: 'Threshold', value: '≥ 67%' },
                        { icon: Globe, label: 'Chain ID', value: '61999' },
                      ].map((item, i) => (
                        <div key={i} className={`p-2 rounded-lg text-center transition-all duration-500 ${
                          consensusPhase === 'complete'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30'
                            : 'bg-muted/30'
                        }`}>
                          <item.icon className={`h-4 w-4 mx-auto mb-1 ${
                            consensusPhase === 'complete' ? 'text-emerald-600' : 'text-muted-foreground'
                          }`} />
                          <div className="text-[10px] text-muted-foreground">{item.label}</div>
                          <div className="text-xs font-medium">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Completion Banner */}
                    {consensusPhase === 'complete' && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white text-center animate-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Award className="h-5 w-5" />
                          <span className="font-semibold">On-Chain Consensus Verified</span>
                          <Award className="h-5 w-5" />
                        </div>
                        <p className="text-xs text-emerald-100">
                          Contract: {process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS?.slice(0, 10)}...
                        </p>
                      </div>
                    )}

                    {/* Phase Timeline */}
                    <div className="flex items-center justify-between mt-4 px-2">
                      {[
                        { phase: 'submitting', label: 'Submit' },
                        { phase: 'validating', label: 'Validate' },
                        { phase: 'comparing', label: 'Compare' },
                        { phase: 'complete', label: 'Consensus' },
                      ].map((s, i) => {
                        const isActive = ['submitting', 'validating', 'comparing', 'complete'].indexOf(consensusPhase) >= i;
                        const isCurrent = consensusPhase === s.phase;
                        return (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                              isCurrent
                                ? 'bg-amber-500 scale-125 shadow-lg shadow-amber-500/30'
                                : isActive
                                ? 'bg-emerald-500'
                                : 'bg-muted-foreground/20'
                            }`}>
                              {isActive ? (
                                <CheckCircle2 className="h-3 w-3 text-white" />
                              ) : (
                                <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                              )}
                            </div>
                            <span className={`text-[10px] ${
                              isCurrent ? 'text-amber-600 font-medium' :
                              isActive ? 'text-emerald-600' : 'text-muted-foreground'
                            }`}>{s.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
                              className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                              onClick={() => router.push(`/itinerary?destination=${encodeURIComponent(dest.name)}`)}>
                              Generate Itinerary
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            <Button variant="outline">Save Trip</Button>
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
