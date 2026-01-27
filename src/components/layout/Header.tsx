'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/deposit', label: 'Deposit' },
    { href: '/withdraw', label: 'Withdraw' },
    { href: '/transactions', label: 'History' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold text-white">Nethermind</span>
            <span className="text-lg font-light text-violet-400 ml-1">Bridge</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                pathname === item.href
                  ? "bg-violet-500/20 text-violet-300"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Connect Button */}
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  style: {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        className="px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-full transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                      >
                        Connect Wallet
                      </button>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openChainModal}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-all"
                      >
                        {chain.hasIcon && (
                          <div className="w-5 h-5 rounded-full overflow-hidden">
                            {chain.iconUrl && (
                              <img
                                alt={chain.name ?? 'Chain'}
                                src={chain.iconUrl}
                                className="w-5 h-5"
                              />
                            )}
                          </div>
                        )}
                        <span className="text-sm text-gray-300 hidden sm:inline">{chain.name}</span>
                      </button>

                      <button
                        onClick={openAccountModal}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm font-medium text-white transition-all"
                      >
                        {account.displayName}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
}
