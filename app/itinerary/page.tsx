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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  MapPin,
  Clock,
  Utensils,
  Hotel,
  Bus,
  Camera,
  DollarSign,
  Users,
  Download,
  Share2,
  Loader2,
  Sparkles,
  Shuffle,
} from 'lucide-react';
import { supabase, type Destination } from '@/lib/supabase';
import { generateItinerary } from '@/lib/genlayer';

interface DayItinerary {
  day: number;
  date: string;
  activities: Activity[];
  meals: Meal[];
  accommodation: Accommodation;
  estimatedCost: string;
}

interface Activity {
  id: string;
  time: string;
  duration: string;
  name: string;
  description: string;
  location: string;
  type: 'attraction' | 'experience' | 'transport' | 'rest';
  cost: string;
}

interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: string;
  restaurant: string;
  cuisine: string;
  estimatedCost: string;
}

interface Accommodation {
  name: string;
  type: string;
  location: string;
  cost: string;
  checkIn: string;
  checkOut: string;
}

const activityIcons: Record<string, React.ReactNode> = {
  attraction: <Camera className="h-4 w-4" />,
  experience: <Sparkles className="h-4 w-4" />,
  transport: <Bus className="h-4 w-4" />,
  rest: <Hotel className="h-4 w-4" />,
};

const mealLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

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
  const [itinerary, setItinerary] = useState<DayItinerary[]>([]);
  const [activeDay, setActiveDay] = useState('1');

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

      const dailyPlans = result?.daily_plans || [];
      const generatedItinerary: DayItinerary[] = dailyPlans.map((day: any, i: number) => {
        const date = new Date();
        date.setDate(date.getDate() + i);

        const activities: Activity[] = (day.activities || []).map((a: any, j: number) => ({
          id: `${i + 1}-${j + 1}`,
          time: a.time || '09:00',
          duration: '2h',
          name: a.activity_name || a.name || 'Activity',
          description: a.description || '',
          location: a.location || selectedDestination!.name,
          type: (a.activity_type || 'experience') as Activity['type'],
          cost: a.estimated_cost ? `$${a.estimated_cost}` : '-',
        }));

        const meals: Meal[] = (day.meals || []).map((m: any) => ({
          type: (m.type || 'lunch') as Meal['type'],
          time: m.time || '12:00',
          restaurant: m.restaurant || 'Local Restaurant',
          cuisine: m.cuisine || 'Local',
          estimatedCost: m.estimated_cost ? `$${m.estimated_cost}` : '-',
        }));

        const accommodation: Accommodation = {
          name: day.accommodation?.name || `${selectedDestination!.name} Hotel`,
          type: 'Hotel',
          location: selectedDestination!.name,
          cost: day.accommodation?.cost ? `$${day.accommodation.cost}` : '-',
          checkIn: '14:00',
          checkOut: '12:00',
        };

        return {
          day: i + 1,
          date: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          activities,
          meals,
          accommodation,
          estimatedCost: day.total_day_cost ? `$${day.total_day_cost}` : '-',
        };
      });

      setItinerary(generatedItinerary);
    } catch (e) {
      console.error('Failed to generate itinerary:', e);
    }
    setIsLoading(false);
  };

  const totalCost = itinerary.reduce((sum, day) => {
    const cost = parseFloat(day.estimatedCost.replace(/[^\d]/g, ''));
    return sum + (isNaN(cost) ? 0 : cost);
  }, 0);

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
            Get a detailed day-by-day itinerary with activities, meals, accommodations, and cost estimates.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg">Trip Details</CardTitle>
                <CardDescription>Configure your itinerary preferences</CardDescription>
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
                  <Label htmlFor="duration">Duration (days)</Label>
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
                  <Label htmlFor="budget">Total Budget (USD)</Label>
                  <Input
                    id="budget"
                    placeholder="e.g., $2,000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travelers">Travelers</Label>
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
                    <Label htmlFor="preferences">Special Preferences</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const prefs = [
                          'Focus on local food experiences and street food tours',
                          'Prioritize photography spots and scenic viewpoints',
                          'Include adventure activities like hiking and kayaking',
                          'Budget-friendly with free attractions and cheap eats',
                          'Cultural immersion: museums, temples, and historical sites',
                          'Relaxation focused: spas, beaches, and leisure time',
                          'Family-friendly activities with kids-friendly dining',
                          'Romantic itinerary with fine dining and sunset views',
                          'Eco-tourism: sustainable travel and nature conservation',
                          'Nightlife and entertainment: bars, live music, and shows',
                          'Off-the-beaten-path experiences, avoid tourist crowds',
                          'Wellness retreat: yoga, meditation, and healthy meals',
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
                    placeholder="e.g., Focus on cultural experiences, vegetarian food options..."
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
                    AI is planning your perfect trip to {selectedDestination?.name}...
                  </p>
                </CardContent>
              </Card>
            )}

            {itinerary.length > 0 && !isLoading && (
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
                            <span className="font-semibold">{budget || `$${totalCost.toLocaleString()}`}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Export PDF
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share2 className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Tabs value={activeDay} onValueChange={setActiveDay}>
                  <TabsList className="w-full justify-start">
                    {itinerary.map((day) => (
                      <TabsTrigger key={day.day} value={day.day.toString()} className="flex-1 max-w-[120px]">
                        Day {day.day}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {itinerary.map((day) => (
                    <TabsContent key={day.day} value={day.day.toString()} className="mt-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-bold">Day {day.day}</h2>
                          <p className="text-sm text-muted-foreground">{day.date}</p>
                        </div>
                        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-600">
                          {day.estimatedCost}
                        </Badge>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Activities
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {day.activities.map((activity, i) => (
                              <div key={activity.id} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white">
                                    {activityIcons[activity.type]}
                                  </div>
                                  {i < day.activities.length - 1 && (
                                    <div className="w-0.5 flex-1 bg-border mt-2" />
                                  )}
                                </div>
                                <div className="flex-1 pb-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-muted-foreground">
                                          {activity.time}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {activity.duration}
                                        </Badge>
                                      </div>
                                      <h4 className="font-medium mt-1">{activity.name}</h4>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {activity.description}
                                      </p>
                                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {activity.location}
                                        </span>
                                        {activity.cost !== '-' && activity.cost !== 'Free' && (
                                          <span className="flex items-center gap-1">
                                            <DollarSign className="h-3 w-3" />
                                            {activity.cost}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Utensils className="h-4 w-4" />
                            Meals
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid md:grid-cols-3 gap-4">
                            {day.meals.map((meal, i) => (
                              <div key={i} className="p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary">{mealLabels[meal.type]}</Badge>
                                  <span className="text-xs text-muted-foreground">{meal.time}</span>
                                </div>
                                <div className="font-medium text-sm">{meal.restaurant}</div>
                                <div className="text-xs text-muted-foreground">{meal.cuisine}</div>
                                <div className="text-xs font-medium mt-2">{meal.estimatedCost}</div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Hotel className="h-4 w-4" />
                            Accommodation
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                            <div>
                              <div className="font-medium">{day.accommodation.name}</div>
                              <div className="text-sm text-muted-foreground">{day.accommodation.type}</div>
                              {day.accommodation.location !== '-' && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {day.accommodation.location}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{day.accommodation.cost}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Day {day.day} Total Cost:</span>
                          <span className="text-xl font-bold">{day.estimatedCost}</span>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

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

            {itinerary.length === 0 && !isLoading && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Itinerary Generated</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Select a destination and configure your preferences to generate a detailed itinerary.
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
