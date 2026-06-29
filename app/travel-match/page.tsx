'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  MapPin,
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  Sparkles,
  Camera,
  Trees,
  Mountain,
  Heart,
  Sun,
  Star,
  ArrowRight,
  CheckCircle,
  DollarSign,
  Eye,
  Compass,
  Plane,
} from 'lucide-react';
import { matchByTravelVibe } from '@/lib/genlayer';
import { supabase, buildDestMap } from '@/lib/supabase';

const fallbackImages = [
  'https://images.pexels.com/photos/2161467/pexels-photo-2161467.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2387871/pexels-photo-2387871.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2090645/pexels-photo-2090645.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1005417/pexels-photo-1005417.jpeg?auto=compress&cs=tinysrgb&w=800',
];

const getFallbackImage = (index: number) => fallbackImages[index % fallbackImages.length];

interface MatchResult {
  name: string;
  location: string;
  description: string;
  match_score: number;
  why_match: string;
  image_vibe_match: number;
  estimated_cost: { min: number; max: number };
}

interface ImageAnalysis {
  landscape_type: string;
  atmosphere: string;
  dominant_colors: string[];
  natural_elements: string[];
  human_activity_level: number;
  vibe_summary: string;
}

export default function TravelMatchPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [analysisFeatures, setAnalysisFeatures] = useState<string[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [caption, setCaption] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setMatches([]);
        setImageAnalysis(null);
        setAnalysisFeatures([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return '0x' + Math.abs(hash).toString(16).padStart(8, '0');
  };

  const analyzeAndMatch = async () => {
    if (!uploadedImage) return;

    setIsLoading(true);
    setMatches([]);
    setImageAnalysis(null);
    setAnalysisFeatures([]);

    try {
      const imageHash = simpleHash(uploadedImage);

      // Fetch real destinations from Supabase for enrichment after GenLayer matching
      const { data: allDests } = await supabase.from('destinations').select('*');

      const result = await matchByTravelVibe(
        imageHash,
        caption || 'travel photo',
        5,
      );

      const analysis: ImageAnalysis = result?.image_analysis || {};
      const matchList: MatchResult[] = result?.matches || [];

      if (matchList.length === 0 && process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS) {
        // GenLayer tx still pending — wait, don't silently show empty
        setIsLoading(false);
        return;
      }

      setImageAnalysis(analysis);

      // Build feature list from analysis
      const features: string[] = [];
      if (analysis.landscape_type) features.push(`Landscape: ${analysis.landscape_type}`);
      if (analysis.atmosphere) features.push(`Atmosphere: ${analysis.atmosphere}`);
      if (analysis.dominant_colors?.length) features.push(`Colors: ${analysis.dominant_colors.join(', ')}`);
      if (analysis.natural_elements?.length) features.push(`Elements: ${analysis.natural_elements.join(', ')}`);
      if (analysis.human_activity_level !== undefined) features.push(`Activity level: ${analysis.human_activity_level}%`);
      if (analysis.vibe_summary) features.push(`Vibe: ${analysis.vibe_summary}`);

      // Animate features appearing
      for (const f of features) {
        await new Promise((r) => setTimeout(r, 300));
        setAnalysisFeatures((prev) => [...prev, f]);
      }

      // Enrich matches with full data + images from Supabase
      const nameToDest = buildDestMap(allDests || []);

      const enrichedMatches = matchList.map((m, i) => {
        const dbMatch = nameToDest.get((m.name || '').toLowerCase());
        if (!dbMatch) return null;
        return {
          name: dbMatch.name,
          location: dbMatch.location,
          description: dbMatch.description || '',
          match_score: m.match_score || 85,
          why_match: m.why_match || '',
          image_vibe_match: m.image_vibe_match || m.match_score || 85,
          estimated_cost: { min: dbMatch.average_cost_min || 0, max: dbMatch.average_cost_max || 0 },
          _imageUrl: dbMatch.image_url || null,
          _index: i,
        };
      }).filter((x): x is NonNullable<typeof x> => x != null);

      setMatches(enrichedMatches);
    } catch (e) {
      console.error('Travel match failed:', e);
    }

    setIsLoading(false);
  };

  const removeImage = () => {
    setUploadedImage(null);
    setMatches([]);
    setImageAnalysis(null);
    setAnalysisFeatures([]);
    setCaption('');
  };

  const formatPrice = (min: number | null | undefined, max: number | null | undefined): string => {
    if (!min && !max) return 'Price varies';
    if (!max) return `$${min?.toLocaleString()}+ per person`;
    return `$${min?.toLocaleString()} - $${max?.toLocaleString()} per person`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-emerald-50 dark:from-teal-950/20 dark:via-background dark:to-emerald-950/20 relative">
      {/* Floating travel decorations */}
      <div className="absolute top-24 left-[8%] text-emerald-300/20 dark:text-emerald-500/20 animate-float">
        <Compass className="h-14 w-14" />
      </div>
      <div className="absolute top-32 right-[10%] text-teal-300/20 dark:text-teal-500/20 animate-float-delayed">
        <MapPin className="h-12 w-12" />
      </div>
      <div className="absolute bottom-40 left-[12%] text-emerald-300/15 dark:text-emerald-500/15 animate-float-slow">
        <Plane className="h-10 w-10" />
      </div>

      {/* Dotted route lines */}
      <div className="absolute top-1/3 left-0 w-full h-px pointer-events-none">
        <svg className="w-full h-4" viewBox="0 0 1200 16" fill="none">
          <path d="M0 8 C200 0, 450 16, 700 8 C950 0, 1100 16, 1200 8" stroke="currentColor" className="text-emerald-300/30 dark:text-emerald-600/20" strokeWidth="2" strokeDasharray="5 5" />
        </svg>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-400">
            <Camera className="mr-2 h-3 w-3" />
            AI Travel Match
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Find Destinations That Match Your Style
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload a photo of your favorite place and GenLayer AI will find destinations with similar vibes.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg">Upload Your Inspiration</CardTitle>
                <CardDescription>Share a photo that captures your ideal travel vibe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!uploadedImage ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      dragActive
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                        : 'border-muted hover:border-emerald-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('fileInput')?.click()}
                  >
                    <input
                      id="fileInput"
                      type="file"
                      accept="image/*"
                      onChange={handleInput}
                      className="hidden"
                    />
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-1">Drop your photo here</p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {uploadedImage && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">What do you love about this place?</label>
                      <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="e.g., I love how peaceful it is..."
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                        disabled={isLoading}
                      />
                    </div>

                    <Button
                      onClick={analyzeAndMatch}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing with AI...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Find Matching Destinations
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {isLoading && analysisFeatures.length > 0 && (
              <Card className="border-emerald-200 dark:border-emerald-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="h-4 w-4 text-emerald-500" />
                    AI Image Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysisFeatures.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm animate-in fade-in slide-in-from-left-2 duration-300"
                      >
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                      style={{ width: `${Math.min((analysisFeatures.length / 6) * 100, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {matches.length > 0 && !isLoading && (
              <>
                <Alert className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <AlertTitle>{matches.length} Destinations Match Your Style</AlertTitle>
                  <AlertDescription>
                    GenLayer AI analyzed your photo and found these similar locations.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  {matches.map((match, index) => (
                    <Card
                      key={index}
                      className={`overflow-hidden ${
                        index === 0 ? 'border-2 border-emerald-500' : ''
                      }`}
                    >
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/3 relative">
                          <img
                            src={(match as any)._imageUrl || getFallbackImage(index)}
                            alt={match.name}
                            className="w-full h-48 md:h-full object-cover"
                          />
                          {index === 0 && (
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                <Star className="mr-1 h-3 w-3 fill-current" />
                                Best Match
                              </Badge>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                            <Badge className="bg-white/90 text-gray-900">
                              <Heart className="mr-1 h-3 w-3 text-red-500" />
                              {match.match_score}% Match
                            </Badge>
                            {match.image_vibe_match > 0 && (
                              <Badge className="bg-white/90 text-gray-900">
                                <Eye className="mr-1 h-3 w-3 text-blue-500" />
                                {match.image_vibe_match}% Vibe
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-bold">{match.name}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {match.location}
                              </p>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">
                            {match.description}
                          </p>

                          {match.why_match && (
                            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 mb-3">
                              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Why this matches:</p>
                              <p className="text-sm text-muted-foreground">{match.why_match}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {formatPrice(match.estimated_cost?.min, match.estimated_cost?.max)}
                            </div>
                          </div>

                          <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                            View Details
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {matches.length === 0 && !isLoading && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Analysis Yet</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Upload a photo of a destination you love to find similar places.
                  </p>
                  <div className="max-w-xs mx-auto grid grid-cols-3 gap-4 opacity-40">
                    <Sun className="h-8 w-8 text-muted-foreground mx-auto" />
                    <Mountain className="h-8 w-8 text-muted-foreground mx-auto" />
                    <Trees className="h-8 w-8 text-muted-foreground mx-auto" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
