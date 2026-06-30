'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wallet, AlertTriangle, ExternalLink } from 'lucide-react';

export default function MetaMaskRequiredModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Wallet Not Compatible
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground px-2">
          <p>
            It looks like you&apos;re using a wallet that doesn&apos;t support
            MetaMask Snaps.
          </p>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 space-y-2">
            <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Why MetaMask?
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              TravelMind AI runs on the <strong>GenLayer blockchain</strong> and uses
              the <strong>GenLayer Snap</strong> to securely sign transactions from
              your browser. MetaMask Snaps are only available in MetaMask.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-foreground">What you can do:</p>
            <ol className="space-y-2 text-sm list-decimal list-inside text-muted-foreground pl-0">
              <li>
                <strong>Switch to MetaMask</strong> in your browser&apos;s
                extension menu, then connect again.
              </li>
              <li>
                <strong>Install MetaMask</strong> if you don&apos;t have it yet
                &mdash; it&apos;s free and takes less than a minute.
              </li>
              <li>
                Once connected, MetaMask will prompt you to install the
                <strong> GenLayer Snap</strong> &mdash; just approve it and
                you&apos;re all set.
              </li>
            </ol>
          </div>

          <p>
            Don&apos;t have MetaMask?{' '}
            <a
              href="https://metamask.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-teal-600 dark:text-teal-400 underline underline-offset-2 hover:text-teal-700 dark:hover:text-teal-300"
            >
              Download MetaMask <ExternalLink className="h-3 w-3 inline" />
            </a>
          </p>
        </div>
        <div className="flex justify-end pt-2 px-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="px-6">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
