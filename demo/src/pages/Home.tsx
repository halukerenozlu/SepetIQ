import { Link } from "react-router-dom";
import { useDemoCustomer } from "../components/DemoCustomerContext";
import { Stars } from "../components/Stars";
import { formatCurrency, products } from "../lib/products";
import { getRemainingBudget } from "../lib/personas";

export function Home() {
  const { customer } = useDemoCustomer();

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <section className="grid gap-8 pb-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
            SepetIQ Demo Store
          </p>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
            Gercek alisveris akisi gibi davranan kontrollu demo magazasi.
          </h1>
        </div>
        <p className="text-base leading-7 text-zinc-600">
          Urun inceleme, sepet, odeme ve hesap gecmisi akislari tek yerde.
          Gercek siteleri beklemeden alisveris senaryolarini prova edebilirsin.
        </p>
      </section>

      <section className="mb-8 grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 md:grid-cols-[1fr_1fr_1fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
            Hesabim
          </p>
          <p className="mt-2 text-lg font-black text-zinc-950">
            {customer.name} · {customer.city}
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
            Bu ay kalan limit
          </p>
          <p className="mt-2 text-lg font-black text-zinc-950">
            {formatCurrency(getRemainingBudget(customer))}
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
            Son baktiklarin
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-zinc-600">
            {customer.recentViews.join(", ")}
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.slug}`}
            className="product-card group overflow-hidden rounded-lg border border-zinc-200 bg-white transition duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-200/70"
          >
            <div className="relative aspect-square overflow-hidden bg-zinc-100">
              <img
                src={product.gorselUrl}
                alt={product.ad}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-zinc-900 shadow-sm">
                Hemen teslim
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="min-h-20">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-600">
                    {product.kategori}
                  </span>
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700">
                    {product.scenario.stockLabel}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold leading-snug text-zinc-950">
                  {product.ad}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
                  {product.aciklama}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-600">
                {product.scenario.viewCountLabel}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-zinc-400 line-through">
                    {formatCurrency(Math.round(product.fiyat * 1.18))}
                  </p>
                  <span className="text-xl font-black text-zinc-950">
                    {formatCurrency(product.fiyat)}
                  </span>
                </div>
                <Stars value={product.ortalamaPuan} />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
