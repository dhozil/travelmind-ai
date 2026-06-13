import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Shield,
  Brain,
  Zap,
  Globe,
  ChevronRight,
  CheckCircle2,
  Wallet,
  Target,
} from 'lucide-react';



const values = [
  {
    icon: Shield,
    title: 'Transparency',
    description: 'Recommendations are verified by multiple AI validators, not sponsored content.',
  },
  {
    icon: Brain,
    title: 'Intelligence',
    description: 'Advanced AI understands your preferences and finds perfect matches.',
  },
  {
    icon: Wallet,
    title: 'Web3 Native',
    description: 'Built on GenLayer blockchain for decentralized validation.',
  },
  {
    icon: Globe,
    title: 'Global Coverage',
    description: 'Discover destinations worldwide with authentic local insights.',
  },
];

const timeline = [
  { year: '2023', event: 'Idea conceived during a trip exploring hidden gems' },
  { year: '2024 Q1', event: 'First prototype with basic AI recommendation' },
  { year: '2024 Q2', event: 'GenLayer integration for validator consensus' },
  { year: '2024 Q3', event: 'Launched AI Itinerary Generator' },
  { year: '2024 Q4', event: 'Added Travel Match and Hidden Gems features' },
  { year: '2025', event: 'Expanded to global destinations worldwide' },
  { year: '2026', event: 'Integrated with GenLayer StudioNet' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-teal-50/30 to-background dark:via-teal-950/20">
      <div className="container mx-auto px-4 py-12">
        {/* Hero */}
        <section className="text-center mb-20">
          <Badge className="mb-4" variant="outline">
            About Us
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Revolutionizing Travel Discovery with AI
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            TravelMind AI uses cutting-edge artificial intelligence and blockchain technology to deliver trustworthy,
            unbiased travel recommendations.
          </p>
        </section>

        {/* Mission */}
        <section className="mb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground mb-6">
                We believe everyone deserves authentic travel experiences, not sponsored recommendations disguised
                as genuine advice. TravelMind AI was created to solve this problem.
              </p>
              <p className="text-muted-foreground mb-6">
                Traditional travel platforms often push paid listings and popular destinations. Our AI focuses on
                finding what truly matches your preferences, and our GenLayer validation ensures recommendations
                are unbiased and trustworthy.
              </p>
              <div className="space-y-3">
                {['No sponsored listings', 'AI-verified recommendations', 'Transparent algorithm', 'Focus on authenticity'].map(
                  (item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span>{item}</span>
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-3xl blur-3xl" />
              <div className="relative rounded-2xl border bg-card p-8">
                <div className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                  Why GenLayer?
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  GenLayer&apos;s unique consensus mechanism ensures our recommendations are trustworthy.
                </p>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="font-medium mb-1">Multiple AI Validators</div>
                    <div className="text-sm text-muted-foreground">
                      Different AI models analyze independently to prevent bias
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="font-medium mb-1">Consensus Mechanism</div>
                    <div className="text-sm text-muted-foreground">
                      Results are verified through blockchain consensus
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="font-medium mb-1">Tamper-Proof Results</div>
                    <div className="text-sm text-muted-foreground">
                      Once validated, recommendations cannot be altered
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground">What drives us to build better travel experiences</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title}>
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white mb-4">
                    <value.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{value.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">Our Journey</h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="relative border-l-2 border-teal-200 dark:border-teal-800 pl-6 space-y-8">
              {timeline.map((item, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-8 top-0 h-4 w-4 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600" />
                  <div className="text-sm font-bold text-teal-600">{item.year}</div>
                  <div className="text-muted-foreground">{item.event}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-gradient-to-r from-teal-600 to-emerald-700 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-8">TravelMind AI by the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '51', label: 'Destinations' },
              { value: '49', label: 'Vibe Types' },
              { value: '3', label: 'AI Validators' },
              { value: '24/7', label: 'AI Support' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-teal-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
