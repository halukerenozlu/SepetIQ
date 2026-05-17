import { Link, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-[#f7f7f5]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="text-lg font-black tracking-tight">
            SepetIQ Demo Store
          </Link>
          <div className="hidden text-sm font-medium text-zinc-500 sm:block">
            Elektronik vitrini
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
