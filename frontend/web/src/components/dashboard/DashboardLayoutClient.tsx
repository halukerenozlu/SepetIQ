'use client';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { LogoutButton } from '@/components/dashboard/LogoutButton';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/history': 'Karar Geçmişi',
  '/dashboard/purchases': 'Alışverişlerim',
  '/dashboard/stats': 'İstatistikler',
  '/dashboard/preferences': 'Tercihler',
};

export default function DashboardLayout({
  children,
  demoUser,
  displayName,
}: {
  children: React.ReactNode;
  demoUser?: string;
  displayName?: string;
}) {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? 'Dashboard';

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Navigation */}
        <header className="flex h-16 items-center justify-between border-b px-4 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-6 w-6 text-zinc-600" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menü</SheetTitle>
                </SheetHeader>
                <Sidebar />
              </SheetContent>
            </Sheet>
            <h2 className="text-lg font-semibold text-zinc-900 lg:hidden">SepetIQ</h2>
            <h1 className="hidden lg:block text-base font-semibold text-zinc-900">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium text-zinc-900">{displayName}</p>
              <p className="text-xs text-zinc-500">Kullanıcı</p>
            </div>
            <LogoutButton />
          </div>
        </header>

        {/* Demo Banner */}
        {demoUser && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-sm font-medium text-amber-800">
              Demo modundasın ({demoUser})
            </p>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
