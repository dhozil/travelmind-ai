'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bookmark,
  Route,
  Clock,
  DollarSign,
  Users,
  MapPin,
  Trophy,
  RefreshCw,
} from 'lucide-react';
import { getUserTrips, getUserRecommendations, getChainStats } from '@/lib/genlayer';

interface Trip {
  id: string;
  wallet: string;
  data: Record<string, any>;
  created_at: number;
  onchain_verified: boolean;
}

interface Recommendation {
  id: string;
  wallet: string;
  query: string;
  preferences: Record<string, any>;
  results: Record<string, any>[];
  consensus_score: number;
  created_at: number;
}

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

function picHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function DashboardPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [stats, setStats] = useState<{ total_trips: number; total_recommendations: number; total_users: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshKeyRef = useRef(0);

  const loadData = useCallback(async (showLoading = false) => {
    if (!wallet) return;
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const [tripData, recData, statsData] = await Promise.all([
        getUserTrips(wallet),
        getUserRecommendations(wallet),
        getChainStats(),
      ]);
      if (tripData != null) {
        const parsed = typeof tripData === 'string' ? JSON.parse(tripData || '[]') : tripData;
        if (Array.isArray(parsed)) setTrips(parsed);
      }
      if (recData != null) {
        const parsed = typeof recData === 'string' ? JSON.parse(recData || '[]') : recData;
        if (Array.isArray(parsed)) setRecs(parsed);
      }
      if (statsData != null) {
        const parsed = typeof statsData === 'string' ? JSON.parse(statsData || '{}') : statsData;
        if (parsed && typeof parsed === 'object') setStats(parsed);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
    setLoading(false);
    setRefreshing(false);
  }, [wallet]);

  useEffect(() => {
    const init = async () => {
      try {
        const eth = (window as any).ethereum;
        if (eth) {
          const accounts = await eth.request({ method: 'eth_accounts' });
          if (accounts?.[0]) setWallet(accounts[0]);
        }
      } catch {}
    };
    init();
  }, []);

  useEffect(() => {
    if (!wallet) return;
    let rateLimitCount = 0;
    loadData(true);
    const interval = setInterval(async () => {
      try {
        await loadData();
        rateLimitCount = 0;
      } catch {
        rateLimitCount++;
        if (rateLimitCount >= 3) clearInterval(interval);
      }
    }, 30000);
    setTimeout(() => clearInterval(interval), 180000);
    return () => clearInterval(interval);
  }, [wallet, loadData]);

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-emerald-50 dark:from-teal-950/20 dark:via-background dark:to-emerald-950/20 pt-24 flex items-start justify-center">
        <Card className="w-full max-w-md mt-12">
          <CardHeader>
            <CardTitle className="text-center">Connect Wallet</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            Connect your wallet to view your saved trips and recommendations.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-emerald-50 dark:from-teal-950/20 dark:via-background dark:to-emerald-950/20 pt-24">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadData(false)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Route className="h-4 w-4" /> Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.total_trips ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Bookmark className="h-4 w-4" /> Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.total_recommendations ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.total_users ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trips">
          <TabsList className="mb-6">
            <TabsTrigger value="trips">
              <Route className="h-4 w-4 mr-2" /> Saved Trips ({trips.length})
            </TabsTrigger>
            <TabsTrigger value="recs">
              <Bookmark className="h-4 w-4 mr-2" /> Recommendations ({recs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips">
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : trips.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No saved trips yet. Generate an itinerary and save it to see it here.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {trips.map((trip) => {
                  const imgIdx = picHash(trip.data?.destination || trip.id) % fallbackImages.length;
                  return (
                  <Card key={trip.id}>
                    <CardContent className="py-0 flex">
                      <div className="w-28 h-28 shrink-0 overflow-hidden rounded-l-lg">
                        <img src={fallbackImages[imgIdx]} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 py-4 pl-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <p className="font-semibold">
                              {trip.data?.destination || 'Trip'} — {trip.data?.duration || '?'} days
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> ${trip.data?.budget?.toLocaleString() || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" /> {trip.data?.travelers || 1} travelers
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {new Date(trip.created_at * 1000).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">Verified</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                    );
                }
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recs">
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : recs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No saved recommendations yet. Try a recommendation query and save it.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recs.map((rec) => {
                  const imgIdx = picHash(rec.query || rec.id) % fallbackImages.length;
                  return (
                  <Card key={rec.id}>
                    <CardContent className="py-0 flex">
                      <div className="w-28 h-28 shrink-0 overflow-hidden rounded-l-lg">
                        <img src={fallbackImages[imgIdx]} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 py-4 pl-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1 min-w-0">
                            <p className="font-semibold truncate">{rec.query}</p>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Trophy className="h-3 w-3" /> Score: {rec.consensus_score}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {rec.results?.length || 0} destinations
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(rec.created_at * 1000).toLocaleDateString()}
                              </span>
                            </div>
                            {rec.results && rec.results.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {rec.results.slice(0, 3).map((r: any, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {r.name || r.destination || `#${i + 1}`}
                                  </Badge>
                                ))}
                                {rec.results.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{rec.results.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
