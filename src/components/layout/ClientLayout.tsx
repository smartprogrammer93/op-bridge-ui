'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Header } from '@/components/layout/Header';

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <>
      {/* Gradient orb background */}
      <div className="gradient-orb" />
      
      <Header />
      <main className="pt-20 pb-12 relative z-10">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      
      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 border-t border-white/5 bg-black/20 backdrop-blur-xl z-50">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-6">
            <a href="https://nethermind.io" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Nethermind
            </a>
            <a href="https://docs.optimism.io" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Docs
            </a>
          </div>
          <div>
            © 2026 Nethermind Bridge
          </div>
        </div>
      </footer>
    </>
  );
}
