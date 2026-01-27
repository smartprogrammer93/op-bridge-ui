'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Navigation } from './Navigation';

export function Header() {
  return (
    <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold">
            🌉 Bridge
          </Link>
          <Navigation />
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
