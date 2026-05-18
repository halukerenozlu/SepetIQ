'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  History,
  ShoppingBag,
  BarChart3,
  Settings,
  ChevronRight,
  Puzzle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/history', label: 'Karar Geçmişi', icon: History },
  { href: '/dashboard/purchases', label: 'Alışverişlerim', icon: ShoppingBag },
  { href: '/dashboard/stats', label: 'İstatistikler', icon: BarChart3 },
  { href: '/dashboard/preferences', label: 'Tercihler', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden h-screen w-64 flex-col border-r bg-zinc-50/50 lg:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white text-xs font-black">
            IQ
          </div>
          <span>
            Sepet<span className="text-emerald-500">IQ</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-emerald-600 shadow-sm ring-1 ring-zinc-200"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("h-4 w-4", isActive ? "text-emerald-500" : "text-zinc-400")} />
                {item.label}
              </div>
              {isActive && <ChevronRight className="h-3 w-3" />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 space-y-3">
        <a
          href="#"
          title="Chrome Web Store linki yakında eklenecek"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
          className="flex items-center justify-center gap-2 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 opacity-60 cursor-not-allowed"
        >
          <Puzzle className="h-4 w-4" />
          Eklentiyi Yükle
        </a>
        <p className="text-xs text-zinc-400 text-center">SepetIQ v0.1.0-alpha</p>
      </div>
    </div>
  );
}
