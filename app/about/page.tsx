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
  Plane,
  Compass,
  MapPin,
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

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-emerald-50 dark:from-teal-950/20 dark:via-background dark:to-emerald-950/20 relative">
      {/* Floating travel decorations */}
      <div className="absolute top-20 left-[10%] text-teal-300/20 dark:text-teal-500/20 animate-float">
        <Plane className="h-14 w-14" />
      </div>
      <div className="absolute top-32 right-[10%] text-emerald-300/20 dark:text-emerald-500/20 animate-float-delayed">
        <Compass className="h-12 w-12" />
      </div>
      <div className="absolute bottom-64 left-[12%] text-teal-300/15 dark:text-teal-500/15 animate-float-slow">
        <MapPin className="h-10 w-10" />
      </div>

      {/* Dotted route lines */}
      <div className="absolute top-1/3 left-0 w-full h-px pointer-events-none">
        <svg className="w-full h-4" viewBox="0 0 1200 16" fill="none">
          <path d="M0 8 C200 0, 500 16, 800 8 C1000 0, 1100 16, 1200 8" stroke="currentColor" className="text-teal-300/30 dark:text-teal-600/20" strokeWidth="2" strokeDasharray="4 5" />
        </svg>
      </div>

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

        {/* Stats */}
        <section className="bg-gradient-to-r from-teal-600 to-emerald-700 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-8">TravelMind AI by the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '51', label: 'Destinations' },
              { value: '49', label: 'Vibe Types' },
              { value: '5', label: 'AI Validators' },
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
