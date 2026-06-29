'use client';

import Link from 'next/link';
import {
  Plane,
  Twitter,
  Github,
  Linkedin,
  Mail,
  Globe,
} from 'lucide-react';

const footerLinks = {
  product: [
    { name: 'AI Recommendation', href: '/recommendation' },
    { name: 'Itinerary Generator', href: '/itinerary' },
    { name: 'Travel Match', href: '/travel-match' },
    { name: 'Hidden Gems', href: '/hidden-gems' },
    { name: 'Dashboard', href: '/dashboard' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
  ],
  resources: [
    { name: 'Recommendation', href: '/recommendation' },
    { name: 'Hidden Gems', href: '/hidden-gems' },
  ],
};

const socialLinks = [
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
  { name: 'GitHub', icon: Github, href: 'https://github.com' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com' },
];

export function Footer() {
  return (
    <footer className="border-t bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
          <div className="col-span-2">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2 transition-transform duration-300 group-hover:rotate-[-12deg] group-hover:scale-110">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                TravelMind AI
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              AI-powered travel recommendations verified by GenLayer blockchain.
              Find your perfect destination with confidence.
            </p>
            <div className="mt-6 flex space-x-4">
              {socialLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.name}</span>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              2026 TravelMind AI. All rights reserved. Powered by GenLayer.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>Global Community</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:hello@travelmind.ai" className="hover:text-primary transition-colors">
                  hello@travelmind.ai
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
