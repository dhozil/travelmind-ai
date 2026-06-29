'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Plane,
  MapPin,
  Calendar,
  Sparkles,
  Gem,
  Wallet,
  Menu,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import { connectWallet as glConnect, disconnectWallet as glDisconnect, loadStoredAddress, saveStoredAddress } from '@/lib/genlayer';
import { cn } from '@/lib/utils';

const features = [
  {
    name: 'AI Travel Recommendation',
    description: 'Get personalized destination recommendations based on your preferences',
    href: '/recommendation',
    icon: Sparkles,
  },
  {
    name: 'AI Itinerary Generator',
    description: 'Create detailed travel itineraries automatically',
    href: '/itinerary',
    icon: Calendar,
  },
  {
    name: 'AI Travel Match',
    description: 'Find destinations matching your travel style via image analysis',
    href: '/travel-match',
    icon: MapPin,
  },
  {
    name: 'Hidden Gem Finder',
    description: 'Discover undiscovered tourist spots before they become popular',
    href: '/hidden-gems',
    icon: Gem,
  },
  {
    name: 'Dashboard',
    description: 'View your saved trips and recommendations',
    href: '/dashboard',
    icon: Bookmark,
  },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const saved = loadStoredAddress();
    if (saved) setWalletAddress(saved);
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const addr = await glConnect();
      setWalletAddress(addr);
    } catch {
      // Fallback for demo / no-MetaMask environments
      const mockAddress = '0x' + Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      setWalletAddress(mockAddress);
      saveStoredAddress(mockAddress as `0x${string}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    glDisconnect();
    setWalletAddress(null);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2 transition-transform duration-300 group-hover:rotate-[-12deg] group-hover:scale-110">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              TravelMind AI
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6">
            <Link
              href="/"
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === '/' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              Home
            </Link>
            <div
              className="relative"
              onMouseEnter={() => setFeaturesOpen(true)}
              onMouseLeave={() => setFeaturesOpen(false)}
            >
              <button
                onClick={() => setFeaturesOpen(!featuresOpen)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                AI Features
                <svg className={`h-4 w-4 transition-transform ${featuresOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                className={`absolute top-full left-0 mt-2 w-80 rounded-lg border bg-popover p-4 shadow-lg transition-all duration-200 ${featuresOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
              >
                <div className="grid gap-3">
                  {features.map((feature) => (
                    <Link
                      key={feature.name}
                      href={feature.href}
                      onClick={() => setFeaturesOpen(false)}
                      className="flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="h-8 w-8 rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white">
                        <feature.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{feature.name}</div>
                        <div className="text-xs text-muted-foreground">{feature.description}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link
              href="/about"
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === '/about' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              About
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {walletAddress ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 px-3 py-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {truncateAddress(walletAddress)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnectWallet}
                className="text-muted-foreground hover:text-destructive"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-lg"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <nav className="flex flex-col space-y-4 mt-8">
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'text-lg font-medium transition-colors hover:text-primary',
                    pathname === '/' ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  Home
                </Link>
                <div className="space-y-3">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    AI Features
                  </span>
                  <div className="flex flex-col space-y-2 pl-2 border-l-2 border-muted">
                    {features.map((feature) => (
                      <Link
                        key={feature.name}
                        href={feature.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 py-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <feature.icon className="h-4 w-4" />
                        <span className="text-sm">{feature.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
                <Link
                  href="/about"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'text-lg font-medium transition-colors hover:text-primary',
                    pathname === '/about' ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  About
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
