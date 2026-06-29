'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Loader2,
  Sparkles,
  Shuffle,
  CheckCircle2,
  Plane,
  Navigation,
  Globe,
} from 'lucide-react';
import PlaneLoader from '@/components/ui/plane-loader';
import { supabase, type Destination } from '@/lib/supabase';
import { generateItinerary, saveTripToChain } from '@/lib/genlayer';

interface DayPlan {
  day: number;
  title: string;
  highlights: string[];
  cost: number;
}

export default function ItineraryPage() {
  const searchParams = useSearchParams();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [duration, setDuration] = useState('3');
  const [budget, setBudget] = useState('');
  const [travelers, setTravelers] = useState('2');
  const [preferences, setPreferences] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(true);
  const [dailyPlans, setDailyPlans] = useState<DayPlan[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [consensusPhase, setConsensusPhase] = useState<'idle' | 'submitting' | 'validating' | 'comparing' | 'complete' | 'failed'>('idle');
  const [saving, setSaving] = useState(false);
  const lastPlanRef = useRef<any>(null);

  useEffect(() => {
    fetchDestinations();
  }, []);

  useEffect(() => {
    const destName = searchParams.get('destination');
    if (destName && destinations.length > 0) {
      const match = destinations.find((d) =>
        d.name.toLowerCase() === destName.toLowerCase()
      );
      if (match) setSelectedDestination(match);
    }
  }, [searchParams, destinations]);

  const fetchDestinations = async () => {
    setIsLoadingDestinations(true);
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching destinations:', error);
    } else {
      setDestinations(data || []);
    }
    setIsLoadingDestinations(false);
  };

  const handleDestinationChange = (value: string) => {
    const dest = destinations.find(d => d.id === value);
    setSelectedDestination(dest || null);
  };

  const handleGenerateItinerary = async () => {
    if (!selectedDestination) return;

    setIsLoading(true);
    setConsensusPhase('submitting');
    try {
      setConsensusPhase('validating');
      const result = await generateItinerary(
        selectedDestination.name,
        parseInt(duration),
        parseInt(budget) || 1000,
        parseInt(travelers),
        preferences || 'general travel',
      );

      const plans: DayPlan[] = (result?.daily_plans || []).map((p: any) => ({
        day: p.day || 1,
        title: p.title || 'Explore',
        highlights: p.highlights || [],
        cost: p.cost || 0,
      }));

      if (plans.length === 0 && process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS) {
        setConsensusPhase('failed');
        setIsLoading(false);
        return;
      }

      lastPlanRef.current = result;
      setConsensusPhase('complete');
      setDailyPlans(plans);
      setTotalCost(plans.reduce((sum, p) => sum + p.cost, 0));
    } catch (e) {
      console.error('Failed to generate itinerary:', e);
      setConsensusPhase('failed');
    }
    setIsLoading(false);
  };

  const handleSaveTrip = async () => {
    const plan = lastPlanRef.current;
    if (!plan) return;
    setSaving(true);
    try {
      await saveTripToChain({
        destination: selectedDestination?.name,
        duration: parseInt(duration),
        budget: parseInt(budget) || 1000,
        travelers: parseInt(travelers),
        preferences: preferences || 'general travel',
        daily_plans: plan.daily_plans,
        total_cost: totalCost,
      });
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-emerald-50 dark:from-teal-950/20 dark:via-background dark:to-emerald-950/20 relative">
      {/* Floating travel decorations */}
      <div className="absolute top-20 right-[10%] text-teal-300/20 dark:text-teal-500/20 animate-float">
        <Globe className="h-14 w-14" />
      </div>
      <div className="absolute top-40 left-[8%] text-emerald-300/20 dark:text-emerald-500/20 animate-float-delayed">
        <Plane className="h-12 w-12" />
      </div>
      <div className="absolute bottom-40 right-[12%] text-teal-300/15 dark:text-teal-500/15 animate-float-slow">
        <Navigation className="h-8 w-8" />
      </div>

      {/* Dotted route lines */}
      <div className="absolute top-1/4 left-0 w-full h-px pointer-events-none">
        <svg className="w-full h-4" viewBox="0 0 1200 16" fill="none">
          <path d="M0 8 C300 16, 500 0, 800 8 C1000 16, 1100 0, 1200 8" stroke="currentColor" className="text-teal-300/30 dark:text-teal-600/20" strokeWidth="2" strokeDasharray="4 4" />
        </svg>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 text-teal-700 dark:text-teal-400">
            <Calendar className="mr-2 h-3 w-3" />
            AI Itinerary Generator
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Create Your Perfect Trip Itinerary
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get a day-by-day plan with highlights and cost estimates.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg">Trip Details</CardTitle>
                <CardDescription>Configure your itinerary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <Select onValueChange={handleDestinationChange} disabled={isLoading || isLoadingDestinations}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingDestinations ? "Loading..." : "Select destination"} />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map((dest) => (
                        <SelectItem key={dest.id} value={dest.id}>
                          {dest.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Duration (days)</Label>
                  <Select value={duration} onValueChange={setDuration} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 7].map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          {d} Days
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (USD)</Label>
                  <Input
                    id="budget"
                    placeholder="e.g., 1000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Travelers</Label>
                  <Select value={travelers} onValueChange={setTravelers} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['1', '2', '3', '4', '5', '6+'].map((t) => (
                        <SelectItem key={t} value={t}>{t} People</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="preferences">Preferences</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const prefs = [
                          'Local food and street food tours',
                          'Photography spots and scenic viewpoints',
                          'Adventure activities like hiking',
                          'Budget-friendly with free attractions',
                          'Cultural: museums and temples',
                          'Relaxation: beaches and leisure',
                          'Family-friendly activities',
                          'Romantic with fine dining',
                          'Off-the-beaten-path experiences',
                        ];
                        setPreferences(prefs[Math.floor(Math.random() * prefs.length)]);
                      }}
                      disabled={isLoading}
                    >
                      <Shuffle className="mr-1 h-3 w-3" />
                      Random
                    </Button>
                  </div>
                  <Textarea
                    id="preferences"
                    placeholder="e.g., Focus on cultural experiences..."
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    rows={3}
                    className="resize-none"
                    disabled={isLoading}
                  />
                </div>

                <Button
                  onClick={handleGenerateItinerary}
                  disabled={isLoading || !selectedDestination}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Itinerary
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {isLoading && (
              <Card className="border-teal-200 dark:border-teal-800">
                <CardContent className="py-6">
                  {consensusPhase !== 'complete' && consensusPhase !== 'failed' ? (
                    <PlaneLoader
                      label={
                        consensusPhase === 'submitting' ? 'Submitting to GenLayer Bradbury...' :
                        consensusPhase === 'validating' ? `Planning trip to ${selectedDestination?.name}...` :
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
                        <Globe className="h-5 w-5" />
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

            {dailyPlans.length > 0 && !isLoading && (
              <>
                <Card className="border-2 border-teal-200 dark:border-teal-800 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-6 items-center justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-teal-500" />
                          <span className="font-semibold text-lg">{selectedDestination?.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{duration} Days</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{travelers} Travelers</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">${totalCost.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {dailyPlans.map((plan) => (
                    <Card key={plan.day} className="overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-teal-500/5 to-emerald-500/5">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                              {plan.day}
                            </span>
                            Day {plan.day}: {plan.title}
                          </CardTitle>
                          <Badge className="bg-gradient-to-r from-teal-500 to-emerald-600">
                            ${plan.cost.toLocaleString()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {plan.highlights.map((highlight, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              <span className="text-sm">{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="border-2 border-emerald-200 dark:border-emerald-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Total Estimated Cost</div>
                        <div className="text-2xl font-bold">${totalCost.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">For {travelers} travelers</div>
                        <div className="text-lg font-semibold">
                          ${Math.round(totalCost / parseInt(travelers)).toLocaleString()} per person
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleSaveTrip}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
                >
                  {saving ? 'Saving...' : 'Save Trip to GenLayer'}
                </Button>
              </>
            )}

            {dailyPlans.length === 0 && !isLoading && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Itinerary Yet</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Select a destination and click Generate to create your trip plan.
                  </p>
                  {isLoadingDestinations && (
                    <p className="text-sm text-muted-foreground">
                      <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                      Loading destinations...
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
