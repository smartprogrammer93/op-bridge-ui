'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/deposit', label: 'Deposit' },
  { href: '/withdraw', label: 'Withdraw' },
  { href: '/transactions', label: 'Transactions' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-white',
            pathname === item.href ? 'text-white' : 'text-gray-400'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
