import { Link, Outlet } from "react-router-dom";
import { CartProvider, useCart } from "./CartContext";
import { DemoCustomerProvider, useDemoCustomer } from "./DemoCustomerContext";
import { formatCurrency } from "../lib/products";
import { getRemainingBudget } from "../lib/personas";

function Header() {
  const { customer, customers, setCustomerId } = useDemoCustomer();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-[#f7f7f5]/90 backdrop-blur">
      <div
        className="sr-only"
        id="account-session"
        data-account-id={customer.id}
        data-account-name={customer.name}
        data-delivery-city={customer.city}
        data-cart-count={itemCount}
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-3">
        <Link to="/" className="shrink-0 text-lg font-black tracking-tight">
          SepetIQ Demo Store
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-6 text-sm font-semibold text-zinc-600 md:flex">
          <span>Elektronik</span>
          <span>Kuponlarim ({customer.coupons})</span>
          <Link to="/account/orders" className="transition hover:text-zinc-950">
            Siparislerim
          </Link>
          <span>Favorilerim</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-black text-zinc-950">Hesabim: {customer.name}</p>
            <p className="text-xs font-medium text-zinc-500">
              {customer.city} teslimat · {formatCurrency(getRemainingBudget(customer))} kalan
            </p>
          </div>
          <select
            aria-label="Demo kullanici sec"
            value={customer.id}
            onChange={(event) => setCustomerId(event.target.value)}
            className="h-10 rounded-[8px] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-900 outline-none transition focus:border-zinc-400"
          >
            {customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <Link
            to="/cart"
            className="rounded-full bg-orange-600 px-3 py-1.5 text-sm font-black text-white transition hover:bg-orange-700"
          >
            Sepetim {itemCount}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function AppShell() {
  return (
    <DemoCustomerProvider>
      <CartProvider>
        <div className="min-h-screen bg-[#f7f7f5] text-zinc-950">
          <Header />
          <main>
            <Outlet />
          </main>
        </div>
      </CartProvider>
    </DemoCustomerProvider>
  );
}
