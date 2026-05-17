import { Link } from "react-router-dom";
import { Stars } from "../components/Stars";
import { formatCurrency, products } from "../lib/products";

export function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <section className="grid gap-8 pb-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
            Demo e-ticaret vitrini
          </p>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
            SepetIQ extension testleri için gerçekçi elektronik ürünleri.
          </h1>
        </div>
        <p className="text-base leading-7 text-zinc-600">
          Bu vitrin veritabanı ya da backend kullanmaz. Ürün detay sayfaları,
          extension scraper için stabil HTML attribute'ları içerir.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.slug}`}
            className="group overflow-hidden rounded-[8px] border border-zinc-200 bg-white transition duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-200/70"
          >
            <div className="aspect-square overflow-hidden bg-zinc-100">
              <img
                src={product.gorselUrl}
                alt={product.ad}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </div>
            <div className="space-y-4 p-5">
              <div className="min-h-20">
                <h2 className="text-lg font-extrabold leading-snug text-zinc-950">
                  {product.ad}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
                  {product.aciklama}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xl font-black text-zinc-950">
                  {formatCurrency(product.fiyat)}
                </span>
                <Stars value={product.ortalamaPuan} />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
