import { Link } from "react-router-dom";
import { useCart } from "../components/CartContext";
import { formatCurrency } from "../lib/products";

export function CartPage() {
  const { discount, items, removeItem, shipping, subtotal, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-16">
        <h1 className="text-3xl font-black tracking-tight">Sepetim</h1>
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-lg font-black text-zinc-950">Sepetin bos.</p>
          <p className="mt-2 text-sm font-medium text-zinc-500">
            Demo akisini baslatmak icin bir urun sayfasindan sepete ekle.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-lg bg-orange-600 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-700"
          >
            Vitrine Don
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8" data-cart-page>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Sepetim</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-500">
            Urunleri, kampanyalari ve teslimat kosullarini kontrol et.
          </p>
        </div>
        <Link
          to="/"
          className="text-sm font-black text-zinc-500 transition hover:text-zinc-950"
        >
          Alisverise devam et
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          {items.map((item) => (
            <article
              key={item.product.id}
              className="basket-item grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-[120px_minmax(0,1fr)_auto]"
              data-cart-line
              data-cart-product-id={item.product.id}
              data-cart-product-name={item.product.ad}
              data-cart-product-price={item.product.fiyat}
            >
              <img
                src={item.product.gorselUrl}
                alt={item.product.ad}
                className="aspect-square rounded-lg bg-zinc-100 object-cover"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-600">
                    {item.product.kategori}
                  </span>
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700">
                    {item.product.scenario.stockLabel}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-black text-zinc-950">
                  {item.product.ad}
                </h2>
                <p className="mt-2 text-sm font-semibold text-zinc-500">
                  Satici: {item.product.satici.ad}
                </p>
                <div className="mt-4 grid gap-2 text-sm font-bold text-zinc-700 sm:grid-cols-2">
                  <span className="rounded-lg bg-orange-50 px-3 py-2 text-orange-800">
                    {item.product.scenario.couponLabel}
                  </span>
                  <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                    {item.product.scenario.shippingLabel}
                  </span>
                  <span className="rounded-lg bg-zinc-50 px-3 py-2">
                    {item.product.scenario.returnLabel}
                  </span>
                  <span className="rounded-lg bg-zinc-50 px-3 py-2">
                    Adet: {item.quantity}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-start justify-between gap-4 md:items-end">
                <p className="text-2xl font-black text-zinc-950">
                  {formatCurrency(item.product.fiyat * item.quantity)}
                </p>
                <button
                  type="button"
                  onClick={() => removeItem(item.product.id)}
                  className="rounded-lg px-3 py-2 text-sm font-black text-red-600 transition hover:bg-red-50"
                >
                  Kaldir
                </button>
              </div>
            </article>
          ))}
        </section>

        <aside className="basket-summary self-start rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-xl font-black">Siparis Ozeti</h2>
          <dl className="mt-5 space-y-3 text-sm font-semibold">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Ara toplam</dt>
              <dd>{formatCurrency(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-emerald-700">
              <dt>Demo kupon indirimi</dt>
              <dd>-{formatCurrency(discount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Kargo</dt>
              <dd>{shipping === 0 ? "Ucretsiz" : formatCurrency(shipping)}</dd>
            </div>
            <div className="border-t border-zinc-200 pt-4">
              <div className="flex justify-between gap-4 text-xl font-black text-zinc-950">
                <dt>Toplam</dt>
                <dd>{formatCurrency(total)}</dd>
              </div>
            </div>
          </dl>
          <Link
            to="/checkout"
            className="mt-6 flex h-12 items-center justify-center rounded-lg bg-orange-600 text-base font-black text-white transition hover:bg-orange-700"
          >
            Alisverisi Tamamla
          </Link>
        </aside>
      </div>
    </div>
  );
}
