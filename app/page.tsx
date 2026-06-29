import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Calendar,
  MapPin,
  Gem,
  Shield,
  Globe,
  Users,
  ArrowRight,
  CheckCircle2,
  Wallet,
  Brain,
  Target,
  Plane,
  Compass,
  Navigation,
  Database,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getChainStats } from '@/lib/genlayer';

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

const features = [
  {
    icon: Sparkles,
    title: 'AI Travel Recommendation',
    description: 'Get personalized destination recommendations based on your natural language preferences. Our AI analyzes budget, duration, activities, and more.',
    href: '/recommendation',
    color: 'from-violet-500 to-purple-600',
    badge: 'Most Popular',
  },
  {
    icon: Calendar,
    title: 'AI Itinerary Generator',
    description: 'Automatically create detailed day-by-day travel itineraries with schedules, costs, dining spots, and attractions.',
    href: '/itinerary',
    color: 'from-blue-500 to-cyan-600',
    badge: 'New',
  },
  {
    icon: MapPin,
    title: 'AI Travel Match',
    description: 'Upload photos of your favorite destinations and let AI find places with similar vibes and atmospheres.',
    href: '/travel-match',
    color: 'from-emerald-500 to-teal-600',
    badge: 'Unique',
  },
  {
    icon: Gem,
    title: 'Hidden Gem Finder',
    description: 'Discover undiscovered tourist spots before they become popular. Find authentic experiences off the beaten path.',
    href: '/hidden-gems',
    color: 'from-amber-500 to-orange-600',
    badge: 'Exclusive',
  },
];

const howItWorks = [
  {
    step: 1,
    title: 'Describe Your Dream Trip',
    description: 'Tell us what you want in natural language. Budget, duration, activities, travel companions, and preferences.',
    icon: Brain,
  },
  {
    step: 2,
    title: 'AI Analyzes Your Needs',
    description: 'Our AI identifies your preferences and searches through thousands of destinations to find matches.',
    icon: Target,
  },
  {
    step: 3,
    title: 'GenLayer Validators Verify',
    description: 'Multiple AI validators independently analyze and reach consensus, ensuring unbiased recommendations.',
    icon: Shield,
  },
  {
    step: 4,
    title: 'Get Personalized Results',
    description: 'Receive detailed recommendations with match scores, reasons, and the ability to generate full itineraries.',
    icon: CheckCircle2,
  },
];

async function getStats() {
  const { count: destCount } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true });
  const { data: vibes } = await supabase
    .from('destinations')
    .select('vibe_type');
  const uniqueVibes = new Set(vibes?.map(v => v.vibe_type).filter(Boolean)).size;

  let chainRecs = '–', chainUsers = '–';
  try {
    const stats = await getChainStats() as any;
    if (stats) {
      chainRecs = String(stats.total_recommendations ?? '–');
      chainUsers = String(stats.total_users ?? '–');
    }
  } catch {
    // GenLayer not configured / unavailable
  }

  return [
    { value: String(destCount ?? 0), label: 'Destinations' },
    { value: chainRecs, label: 'On-Chain Recommendations' },
    { value: chainUsers, label: 'Users' },
    { value: '5', label: 'AI Validators' },
  ];
}

async function getDestinations() {
  const { data } = await supabase
    .from('destinations')
    .select('*')
    .order('authenticity_score', { ascending: false })
    .limit(3);
  return data || [];
}

export default async function Home() {
  const [destinations, stats] = await Promise.all([getDestinations(), getStats()]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 via-white to-emerald-50 dark:from-teal-950/20 dark:via-background dark:to-emerald-950/20">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-teal-400/5 via-emerald-300/5 to-teal-400/5 animate-shimmer pointer-events-none" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40 pointer-events-none" />

        {/* Flying planes across the screen */}
        <div className="absolute top-1/4 left-0 pointer-events-none z-20">
          <Plane className="h-6 w-6 text-teal-500/30 dark:text-teal-400/30 animate-fly-across" />
        </div>
        <div className="absolute top-3/4 left-0 pointer-events-none z-20">
          <Plane className="h-4 w-4 text-emerald-500/25 dark:text-emerald-400/25 animate-fly-across-2" />
        </div>

        {/* Floating glowing particles */}
        <div className="absolute top-[30%] left-[20%] pointer-events-none">
          <div className="h-2 w-2 rounded-full bg-teal-400/40 animate-travel-particle" />
        </div>
        <div className="absolute top-[40%] left-[70%] pointer-events-none">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/30 animate-travel-particle-2" style={{ animationDelay: '1s' }} />
        </div>
        <div className="absolute top-[50%] left-[40%] pointer-events-none">
          <div className="h-2 w-2 rounded-full bg-teal-400/35 animate-travel-particle" style={{ animationDelay: '2s' }} />
        </div>
        <div className="absolute top-[35%] left-[55%] pointer-events-none">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/30 animate-travel-particle-2" style={{ animationDelay: '3s' }} />
        </div>
        <div className="absolute top-[55%] left-[30%] pointer-events-none">
          <div className="h-2 w-2 rounded-full bg-teal-400/25 animate-travel-particle" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Pulsing location markers */}
        <div className="absolute top-[28%] left-[25%] pointer-events-none">
          <div className="h-3 w-3 rounded-full bg-teal-500/30 animate-ring-pulse" />
        </div>
        <div className="absolute top-[45%] left-[65%] pointer-events-none">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/30 animate-ring-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="absolute top-[55%] left-[45%] pointer-events-none">
          <div className="h-2 w-2 rounded-full bg-teal-500/25 animate-ring-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Floating travel decorations */}
        <div className="absolute top-20 left-[10%] text-teal-400/20 dark:text-teal-600/20 animate-float">
          <Plane className="h-16 w-16" />
        </div>
        <div className="absolute top-40 right-[12%] text-emerald-400/20 dark:text-emerald-600/20 animate-float-delayed">
          <Compass className="h-12 w-12" />
        </div>
        <div className="absolute bottom-32 left-[8%] text-teal-400/15 dark:text-teal-600/15 animate-float-slow">
          <MapPin className="h-10 w-10" />
        </div>
        <div className="absolute bottom-40 right-[10%] text-emerald-400/15 dark:text-emerald-600/15 animate-float-delayed">
          <Navigation className="h-8 w-8" />
        </div>

        {/* Dotted travel route lines with animated dashes */}
        <div className="absolute top-1/4 left-0 w-full h-px pointer-events-none">
          <svg className="w-full h-4" viewBox="0 0 1200 16" fill="none">
            <path d="M0 8 C200 0, 400 16, 600 8 C800 0, 1000 16, 1200 8" stroke="currentColor" className="text-teal-300/40 dark:text-teal-600/30" strokeWidth="2" strokeDasharray="4 6" />
            <path d="M0 8 C200 0, 400 16, 600 8 C800 0, 1000 16, 1200 8" stroke="currentColor" className="text-teal-400/60 dark:text-teal-500/40 animate-move-dash" strokeWidth="2" strokeDasharray="4 6" strokeDashoffset="0" />
          </svg>
        </div>
        <div className="absolute bottom-1/3 left-0 w-full h-px pointer-events-none">
          <svg className="w-full h-4" viewBox="0 0 1200 16" fill="none">
            <path d="M0 8 C300 16, 500 0, 700 8 C900 16, 1100 0, 1200 8" stroke="currentColor" className="text-emerald-300/40 dark:text-emerald-600/30" strokeWidth="2" strokeDasharray="6 8" />
            <path d="M0 8 C300 16, 500 0, 700 8 C900 16, 1100 0, 1200 8" stroke="currentColor" className="text-emerald-400/60 dark:text-emerald-500/40 animate-move-dash" strokeWidth="2" strokeDasharray="6 8" strokeDashoffset="0" />
          </svg>
        </div>

        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="flex flex-col items-center text-center">
            <Badge className="mb-6 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800">
              <Wallet className="mr-2 h-3 w-3" />
              Powered by GenLayer Blockchain
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Find Your Perfect
              </span>
              <br />
              <span className="text-foreground">Travel Destination</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              AI-powered recommendations that understand your preferences. Verified by multiple AI validators on blockchain for unbiased, trustworthy results.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-teal-500/25 transition-shadow duration-300" asChild>
                <a href="#features">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Get AI Recommendation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/hidden-gems">
                  <Gem className="mr-2 h-5 w-5" />
                  Explore Hidden Gems
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="container mx-auto px-4 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 scroll-mt-20 relative bg-gradient-to-b from-emerald-50/50 via-white to-teal-50/50 dark:from-emerald-950/10 dark:via-background dark:to-teal-950/10">
        <div className="absolute inset-0 bg-dot-travel opacity-50 pointer-events-none" />
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">AI Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Intelligent Travel Planning
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Four powerful AI tools designed to transform how you discover and plan your travels.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {features.map((feature) => (
              <Link key={feature.title} href={feature.href}>
                <Card className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group cursor-pointer border-2 hover:border-teal-200 dark:hover:border-teal-800">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`rounded-xl bg-gradient-to-br ${feature.color} p-3 text-white shadow-lg`}>
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary">{feature.badge}</Badge>
                    </div>
                    <CardTitle className="mt-4 group-hover:text-teal-600 transition-colors">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                    <div className="mt-4 flex items-center text-sm text-teal-600 font-medium group-hover:translate-x-1 transition-transform">
                      Try it now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-teal-50/50 via-white to-emerald-50/50 dark:from-teal-950/10 dark:via-background dark:to-emerald-950/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Process</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              How TravelMind AI Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our unique GenLayer validation process ensures trustworthy recommendations.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={step.step} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                      <step.icon className="h-8 w-8" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border-2 border-teal-500 flex items-center justify-center text-xs font-bold text-teal-600">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="mt-6 font-semibold text-lg">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-teal-200 to-emerald-200 dark:from-teal-800 dark:to-emerald-800" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GenLayer Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-emerald-50/30 via-white to-teal-50/30 dark:from-emerald-950/5 dark:via-background dark:to-teal-950/5">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">
                <Shield className="mr-2 h-3 w-3" />
                GenLayer Verified
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                Why GenLayer Validation Matters
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Traditional AI travel platforms give recommendations from a single model. TravelMind AI uses GenLayer&apos;s revolutionary consensus mechanism.
              </p>
              <div className="space-y-4">
                {[
                  'Multiple AI validators analyze independently',
                  'Results compared for consensus',
                  'Reduces AI bias and hallucination',
                  'No hidden sponsored recommendations',
                  'Transparent and trustworthy results',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-8 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white" asChild>
                <Link href="/about">
                  Learn About GenLayer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-3xl blur-3xl" />
              <div className="relative rounded-2xl border bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 p-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/50 dark:bg-white/5 border">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                      AI1
                    </div>
                    <div>
                      <div className="font-medium">Validator Alpha</div>
                      <div className="text-sm text-muted-foreground">Analyzing preferences...</div>
                    </div>
                    <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/50 dark:bg-white/5 border">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      AI2
                    </div>
                    <div>
                      <div className="font-medium">Validator Beta</div>
                      <div className="text-sm text-muted-foreground">Evaluating destinations...</div>
                    </div>
                    <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/50 dark:bg-white/5 border">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                      AI3
                    </div>
                    <div>
                      <div className="font-medium">Validator Gamma</div>
                      <div className="text-sm text-muted-foreground">Reaching consensus...</div>
                    </div>
                    <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-center font-medium">
                    Consensus Reached
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-teal-50/50 via-white to-emerald-50/50 dark:from-teal-950/10 dark:via-background dark:to-emerald-950/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Discover</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Top AI-Recommended Destinations
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See what our AI recommends for travelers like you.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {destinations.map((dest, index) => (
              <div key={dest.id} className="group relative overflow-hidden rounded-2xl">
                <div className="aspect-[4/5] relative">
                  <img
                    src={dest.image_url || getFallbackImage(index)}
                    alt={dest.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-teal-400" />
                      <span className="text-sm text-teal-400">{dest.location}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{dest.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {dest.tags?.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="bg-white/10 text-white border-white/20">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-white/20 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full"
                            style={{ width: `${dest.authenticity_score}%` }}
                          />
                        </div>
                        <span className="text-sm text-white font-medium">{dest.authenticity_score}%</span>
                      </div>
                      <Badge className="bg-teal-500 text-white">AI Verified</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button size="lg" variant="outline" asChild>
              <Link href="/recommendation">
                Get Personalized Recommendations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-emerald-700" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Ready to Discover Your Perfect Destination?
            </h2>
            <p className="text-lg text-teal-100 max-w-2xl mx-auto mb-8">
              Discover AI-verified travel recommendations powered by GenLayer consensus.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="bg-white text-teal-700 hover:bg-teal-50" asChild>
                <Link href="/recommendation">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Get Started Free
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
                <Link href="/hidden-gems">
                  <Gem className="mr-2 h-5 w-5" />
                  Explore Hidden Gems
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
