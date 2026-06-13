'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { supabase, type Destination } from '@/lib/supabase';
import { generateItinerary } from '@/lib/genlayer';

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
    try {
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

      setDailyPlans(plans);
      setTotalCost(plans.reduce((sum, p) => sum + p.cost, 0));
    } catch (e) {
      console.error('Failed to generate itinerary:', e);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-blue-50/30 to-background dark:via-blue-950/20">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-700 dark:text-blue-400">
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
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
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
              <Card className="border-blue-200 dark:border-blue-800">
                <CardContent className="py-12 text-center">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Generating Your Itinerary</h3>
                  <p className="text-sm text-muted-foreground">
                    AI validators are planning your trip to {selectedDestination?.name}...
                  </p>
                </CardContent>
              </Card>
            )}

            {dailyPlans.length > 0 && !isLoading && (
              <>
                <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-6 items-center justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-blue-500" />
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
                      <CardHeader className="bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-sm font-bold">
                              {plan.day}
                            </span>
                            Day {plan.day}: {plan.title}
                          </CardTitle>
                          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-600">
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
