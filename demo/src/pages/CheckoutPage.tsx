import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../components/CartContext";
import { useDemoCustomer } from "../components/DemoCustomerContext";
import { formatCurrency } from "../lib/products";

export function CheckoutPage() {
  const { customer } = useDemoCustomer();
  const { discount, items, shipping, subtotal, total } = useCart();
  const [isComplete, setIsComplete] = useState(false);
  const [contractsAccepted, setContractsAccepted] = useState(false);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-16">
        <h1 className="text-3xl font-black tracking-tight">Odeme</h1>
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-lg font-black text-zinc-950">Odeme icin sepet bos.</p>
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
    <div
      className="checkout-page mx-auto max-w-6xl px-5 py-8"
      data-checkout-step="payment"
      data-checkout-user-id={customer.id}
      data-checkout-total={total}
    >
      <div className="mb-8">
        <Link
          to="/cart"
          className="text-sm font-black text-zinc-500 transition hover:text-zinc-950"
        >
          Sepete don
        </Link>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Odeme</h1>
        <p className="mt-2 text-sm font-semibold text-zinc-500">
          Demo odeme ekranidir; gercek kart bilgisi alinmaz.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-5">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-xl font-black">Teslimat Bilgileri</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <input type="radio" name="delivery" defaultChecked className="mt-1" />
                <span>
                  <span className="block font-black text-zinc-950">
                    Standart teslimat
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-zinc-600">
                    1-2 is gunu, ucretsiz
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4">
                <input type="radio" name="delivery" className="mt-1" />
                <span>
                  <span className="block font-black text-zinc-950">
                    Hizli teslimat
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-zinc-600">
                    Ayni gun, 89 TL
                  </span>
                </span>
              </label>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-bold text-zinc-700">
                Ad Soyad
                <input
                  defaultValue={customer.name}
                  className="mt-2 h-11 w-full rounded-lg border border-zinc-200 px-3 font-semibold outline-none focus:border-zinc-400"
                />
              </label>
              <label className="block text-sm font-bold text-zinc-700">
                Sehir
                <input
                  defaultValue={customer.city}
                  className="mt-2 h-11 w-full rounded-lg border border-zinc-200 px-3 font-semibold outline-none focus:border-zinc-400"
                />
              </label>
              <label className="block text-sm font-bold text-zinc-700 md:col-span-2">
                Adres
                <textarea
                  defaultValue={`${customer.city} demo teslimat adresi, SepetIQ Store`}
                  className="mt-2 min-h-24 w-full rounded-lg border border-zinc-200 px-3 py-3 font-semibold outline-none focus:border-zinc-400"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-xl font-black">Fatura Bilgileri</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-bold text-zinc-700">
                Fatura Tipi
                <select className="mt-2 h-11 w-full rounded-lg border border-zinc-200 px-3 font-semibold outline-none focus:border-zinc-400">
                  <option>Bireysel fatura</option>
                  <option>Kurumsal fatura</option>
                </select>
              </label>
              <label className="block text-sm font-bold text-zinc-700">
                E-posta
                <input
                  defaultValue={`${customer.id}@demo.sepetiq`}
                  className="mt-2 h-11 w-full rounded-lg border border-zinc-200 px-3 font-semibold outline-none focus:border-zinc-400"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-xl font-black">Odeme Yontemi</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <label className="block text-sm font-bold text-zinc-700 md:col-span-2">
                Kart Numarasi
                <input
                  defaultValue="4242 4242 4242 4242"
                  className="mt-2 h-11 w-full rounded-lg border border-zinc-200 px-3 font-semibold outline-none focus:border-zinc-400"
                />
              </label>
              <label className="block text-sm font-bold text-zinc-700">
                SKT
                <input
                  defaultValue="12/30"
                  className="mt-2 h-11 w-full rounded-lg border border-zinc-200 px-3 font-semibold outline-none focus:border-zinc-400"
                />
              </label>
              <label className="block text-sm font-bold text-zinc-700">
                CVV
                <input
                  defaultValue="123"
                  className="mt-2 h-11 w-full rounded-lg border border-zinc-200 px-3 font-semibold outline-none focus:border-zinc-400"
                />
              </label>
            </div>
            <div className="mt-5 rounded-lg bg-zinc-50 p-4">
              <p className="text-sm font-black text-zinc-950">Taksit secimi</p>
              <div className="mt-3 grid gap-2 text-sm font-semibold md:grid-cols-3">
                <label className="rounded-lg bg-white p-3 ring-1 ring-zinc-200">
                  <input type="radio" name="installment" defaultChecked /> Tek cekim
                </label>
                <label className="rounded-lg bg-white p-3 ring-1 ring-zinc-200">
                  <input type="radio" name="installment" /> 3 taksit
                </label>
                <label className="rounded-lg bg-white p-3 ring-1 ring-zinc-200">
                  <input type="radio" name="installment" /> 6 taksit
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-xl font-black">Sozlesmeler</h2>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-semibold text-zinc-700">
              <input
                type="checkbox"
                checked={contractsAccepted}
                onChange={(event) => setContractsAccepted(event.target.checked)}
                className="mt-1"
              />
              <span>
                Mesafeli satis sozlesmesini ve on bilgilendirme formunu okudum,
                kabul ediyorum.
              </span>
            </label>
          </div>
        </section>

        <aside className="checkout-summary self-start rounded-lg border border-zinc-200 bg-white p-5 lg:sticky lg:top-24">
          <h2 className="text-xl font-black">Siparis Ozeti</h2>
          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="border-b border-zinc-200 pb-4 last:border-0"
                data-checkout-line
                data-checkout-line-product-id={item.product.id}
              >
                <p className="font-black text-zinc-950">{item.product.ad}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-500">
                  {item.quantity} adet · {item.product.scenario.shippingLabel}
                </p>
                <p className="mt-2 text-sm font-bold text-zinc-700">
                  {item.product.scenario.returnLabel}
                </p>
              </div>
            ))}
          </div>
          <dl className="mt-5 space-y-3 text-sm font-semibold">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Ara toplam</dt>
              <dd>{formatCurrency(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-emerald-700">
              <dt>Demo kupon</dt>
              <dd>-{formatCurrency(discount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Kargo</dt>
              <dd>{shipping === 0 ? "Ucretsiz" : formatCurrency(shipping)}</dd>
            </div>
            <div className="border-t border-zinc-200 pt-4">
              <div className="flex justify-between gap-4 text-xl font-black">
                <dt>Toplam</dt>
                <dd>{formatCurrency(total)}</dd>
              </div>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => setIsComplete(true)}
            disabled={!contractsAccepted}
            className="mt-6 h-12 w-full rounded-lg bg-orange-600 text-base font-black text-white transition hover:bg-orange-700"
            data-complete-payment
          >
            Odemeyi Tamamla
          </button>
          {!contractsAccepted && (
            <p className="mt-2 text-xs font-bold text-zinc-500">
              Odeme icin sozlesmeleri onaylamalisin.
            </p>
          )}
          {isComplete && (
            <div
              className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900"
              data-payment-result="success"
            >
              Demo siparis olusturuldu. Gercek odeme alinmadi.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
