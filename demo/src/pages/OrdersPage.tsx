import { Link } from "react-router-dom";
import { useDemoCustomer } from "../components/DemoCustomerContext";
import { formatCurrency } from "../lib/products";
import { satisfactionLabel, usageLabel } from "../lib/personas";

export function OrdersPage() {
  const { customer } = useDemoCustomer();

  return (
    <div className="account-orders mx-auto max-w-6xl px-5 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">
            Hesabim
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Siparislerim
          </h1>
          <p className="mt-2 text-sm font-semibold text-zinc-500">
            Teslim edilen urunler, iade durumu ve tekrar satin alma islemleri.
          </p>
        </div>
        <Link
          to="/"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-black text-white transition hover:bg-zinc-700"
        >
          Vitrine Don
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="self-start rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-xl font-black">{customer.name}</h2>
          <dl className="mt-5 space-y-3 text-sm font-semibold">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Teslimat sehri</dt>
              <dd>{customer.city}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Aktif kupon</dt>
              <dd>{customer.coupons}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Kayitli siparis</dt>
              <dd>{customer.purchases.length}</dd>
            </div>
          </dl>
        </aside>

        <section className="space-y-4">
          {customer.purchases.map((purchase) => (
            <article
              key={purchase.id}
              className="order-card rounded-lg border border-zinc-200 bg-white p-5"
              data-order-id={purchase.id}
              data-order-category={purchase.category}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      Teslim edildi
                    </span>
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">
                      {purchase.category}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-black text-zinc-950">
                    {purchase.productName}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-zinc-500">
                    {purchase.monthsAgo} ay once · {formatCurrency(purchase.price)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-zinc-500">Memnuniyet</p>
                  <p className="mt-1 text-lg font-black text-zinc-950">
                    {satisfactionLabel(purchase.satisfaction)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm font-semibold md:grid-cols-3">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="font-bold text-zinc-500">Kullanim</p>
                  <p className="mt-1 text-zinc-950">{usageLabel(purchase.usage)}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="font-bold text-zinc-500">Iade durumu</p>
                  <p className="mt-1 text-zinc-950">Iade suresi doldu</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="font-bold text-zinc-500">Fatura</p>
                  <p className="mt-1 text-zinc-950">E-arsiv fatura</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-black text-white transition hover:bg-orange-700">
                  Tekrar Satin Al
                </button>
                <button className="rounded-lg bg-white px-4 py-2 text-sm font-black text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-50">
                  Degerlendir
                </button>
                <button className="rounded-lg bg-white px-4 py-2 text-sm font-black text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-50">
                  Faturayi Gor
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
