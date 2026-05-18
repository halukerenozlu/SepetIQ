import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCart } from "../components/CartContext";
import { useDemoCustomer } from "../components/DemoCustomerContext";
import { Stars } from "../components/Stars";
import { findProductBySlug, formatCurrency, formatDate } from "../lib/products";
import {
  getRemainingBudget,
  getSimilarPurchases,
  satisfactionLabel,
  usageLabel,
} from "../lib/personas";

export function ProductDetail() {
  const { slug } = useParams();
  const product = findProductBySlug(slug);
  const { customer } = useDemoCustomer();
  const { addItem } = useCart();
  const [wasAdded, setWasAdded] = useState(false);

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20">
        <h1 className="text-3xl font-black">Urun bulunamadi</h1>
        <Link to="/" className="mt-6 inline-flex font-bold text-emerald-700">
          Vitrine don
        </Link>
      </div>
    );
  }

  const similarPurchases = getSimilarPurchases(customer, product.kategori);
  const remainingBudget = getRemainingBudget(customer);
  const originalPrice = Math.round(product.fiyat * 1.18);
  const discountRate = Math.round(
    ((originalPrice - product.fiyat) / originalPrice) * 100,
  );

  const handleAddToCart = () => {
    addItem(product);
    setWasAdded(true);
  };

  return (
    <div
      className="product-page mx-auto max-w-6xl px-5 py-8"
      data-cart-state={wasAdded ? "added" : "idle"}
    >
      <Link
        to="/"
        className="mb-6 inline-flex text-sm font-bold text-zinc-500 hover:text-zinc-900"
      >
        Vitrine don
      </Link>

      <article
        className="product-detail grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]"
        data-product-id={product.id}
        data-product-slug={product.slug}
      >
        <div className="space-y-4">
          <div className="product-gallery overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <img
              src={product.gorselUrl}
              alt={product.ad}
              className="product-image aspect-square h-full w-full object-cover"
              data-product-image
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((index) => (
              <button
                key={index}
                type="button"
                className="aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-orange-300"
                aria-label={`${product.ad} gorsel ${index + 1}`}
              >
                <img
                  src={product.gorselUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        <aside className="product-buybox self-start rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="border-b border-zinc-200 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="product-category text-sm font-bold text-emerald-700">
                {product.kategori}
              </p>
              <span className="stock-badge rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700">
                {product.scenario.stockLabel}
              </span>
            </div>
            <h1
              className="product-title mt-2 text-3xl font-black leading-tight tracking-tight text-zinc-950"
              data-product-name
            >
              {product.ad}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <Stars value={product.ortalamaPuan} />
              <span className="review-count text-sm text-zinc-500">
                {product.yorumlar.length} yorum
              </span>
            </div>
            <p className="view-count mt-3 text-sm font-semibold text-zinc-500">
              {product.scenario.viewCountLabel}
            </p>
          </div>

          <div className="space-y-5 py-5">
            <div className="product-pricing">
              <p className="price-original text-sm font-bold text-zinc-400 line-through">
                {formatCurrency(originalPrice)}
              </p>
              <div className="mt-1 flex flex-wrap items-end gap-3">
                <div
                  className="price-current text-4xl font-black tracking-tight text-zinc-950"
                  data-product-price
                >
                  {formatCurrency(product.fiyat)}
                </div>
                <span className="discount-rate rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-700">
                  %{discountRate} indirim
                </span>
              </div>
            </div>

            <div className="seller-card rounded-lg bg-zinc-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                Satici
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p
                    className="seller-name font-extrabold text-zinc-950"
                    data-product-seller
                  >
                    {product.satici.ad}
                  </p>
                  <p className="text-sm text-zinc-500">{product.satici.konum}</p>
                </div>
                <span className="seller-rating rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800">
                  {product.satici.puan.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="campaign-list grid grid-cols-2 gap-3 text-sm">
              <div
                className="campaign-badge rounded-lg bg-orange-50 p-3 font-bold text-orange-800"
                data-product-coupon
              >
                {product.scenario.couponLabel}
              </div>
              <div
                className="shipping-info rounded-lg bg-emerald-50 p-3 font-bold text-emerald-800"
                data-product-shipping
              >
                {product.scenario.shippingLabel}
              </div>
              <div
                className="return-policy rounded-lg bg-zinc-50 p-3 font-bold text-zinc-700"
                data-product-return-policy
              >
                {product.scenario.returnLabel}
              </div>
              <div className="installment-info rounded-lg bg-zinc-50 p-3 font-bold text-zinc-700">
                3 taksit secenegi
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                className="h-12 w-12 rounded-lg border border-zinc-200 bg-white text-xl font-black text-zinc-500 transition hover:border-red-200 hover:text-red-500"
                aria-label="Favorilere ekle"
              >
                ♥
              </button>
              <button
                type="button"
                className="h-12 flex-1 rounded-lg border border-zinc-200 bg-white text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
              >
                Saticiya Sor
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className="add-to-cart h-12 w-full rounded-lg bg-orange-600 text-base font-black text-white transition hover:bg-orange-700 active:scale-[0.99]"
              data-add-to-cart
            >
              {wasAdded ? "Sepete Eklendi" : "Sepete Ekle"}
            </button>

            {wasAdded && (
              <div
                className="cart-confirmation rounded-lg border border-orange-200 bg-orange-50 p-4"
                data-cart-confirmation
                data-cart-product-id={product.id}
                data-cart-product-name={product.ad}
                data-cart-product-price={product.fiyat}
              >
                <p className="text-sm font-black text-orange-900">
                  Urun sepete eklendi.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/cart"
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-black text-white transition hover:bg-orange-700"
                  >
                    Sepete Git
                  </Link>
                  <Link
                    to="/"
                    className="rounded-lg bg-white px-4 py-2 text-sm font-black text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                  >
                    Alisverise Devam Et
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 pt-5">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">
              Urun bilgisi
            </h2>
            <p
              className="mt-3 leading-7 text-zinc-700"
              data-product-description
            >
              {product.aciklama}
            </p>
          </div>

          <div className="account-benefits mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">
                Hesabina ozel
              </h2>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-600 ring-1 ring-zinc-200">
                {customer.coupons} kupon
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-bold text-zinc-500">Kalan limit</p>
                <p className="mt-1 font-black text-zinc-950">
                  {formatCurrency(remainingBudget)}
                </p>
              </div>
              <div>
                <p className="font-bold text-zinc-500">Onceki siparis</p>
                <p className="mt-1 font-black text-zinc-950">
                  {similarPurchases.length > 0
                    ? `${similarPurchases.length} kayit`
                    : "Yok"}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {product.scenario.storefrontSignals.map((signal) => (
                <p
                  key={signal}
                  className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-zinc-600 ring-1 ring-zinc-200"
                >
                  {signal}
                </p>
              ))}
            </div>
          </div>
        </aside>
      </article>

      <section className="mt-10 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            One cikan ozellikler
          </h2>
          <ul className="mt-5 space-y-3 product-specs" data-product-specs>
            {product.ozellikler.map((feature) => (
              <li
                key={feature}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700"
                data-product-spec
              >
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-8 border-t border-zinc-200 pt-6">
            <h2 className="text-2xl font-black tracking-tight">
              Onceki siparislerin
            </h2>
            {similarPurchases.length === 0 ? (
              <p className="mt-4 rounded-lg bg-white p-4 text-sm font-semibold leading-6 text-zinc-600 ring-1 ring-zinc-200">
                Bu kategoride kayitli benzer siparis bulunmuyor.
              </p>
            ) : (
              <div className="mt-4 space-y-3 order-history-preview">
                {similarPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="order-history-item rounded-lg bg-white p-4 ring-1 ring-zinc-200"
                    data-order-category={purchase.category}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-zinc-950">
                          {purchase.productName}
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-500">
                          {purchase.monthsAgo} ay once ·{" "}
                          {formatCurrency(purchase.price)}
                        </p>
                      </div>
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700">
                        {satisfactionLabel(purchase.satisfaction)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-zinc-600">
                      Kullanim: {usageLabel(purchase.usage)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between gap-4 border-b border-zinc-200 pb-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Yorumlar</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Satin alan kullanicilarin son yorumlari
              </p>
            </div>
            <Stars value={product.ortalamaPuan} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
            <button className="rounded-full bg-zinc-900 px-3 py-1.5 text-white">
              En yeni
            </button>
            <button className="rounded-full bg-white px-3 py-1.5 text-zinc-600 ring-1 ring-zinc-200">
              En dusuk puan
            </button>
            <button className="rounded-full bg-white px-3 py-1.5 text-zinc-600 ring-1 ring-zinc-200">
              Fotograflilar
            </button>
          </div>

          <div className="divide-y divide-zinc-200">
            {product.yorumlar.map((review, index) => (
              <article
                key={`${review.yazar}-${review.tarih}`}
                className="review-item py-5"
                data-review
                data-review-id={`${product.id}-review-${index + 1}`}
                data-review-rating={review.puan}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-zinc-950" data-review-author>
                      {review.yazar}
                    </p>
                    <p className="text-sm text-zinc-500">
                      <span data-review-date>{formatDate(review.tarih)}</span>
                      <span> · Satin aldi</span>
                      <span> · Renk: Siyah</span>
                    </p>
                  </div>
                  <Stars value={review.puan} label={`${review.puan} yildiz`} />
                </div>
                <p className="mt-3 leading-7 text-zinc-700" data-review-text>
                  {review.metin}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-500">
                  <span>{12 + index * 3} kisi faydali buldu</span>
                  <button className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
                    Faydali
                  </button>
                </div>
                {review.puan <= 2 && (
                  <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm font-semibold text-zinc-600">
                    Satici cevabi: Deneyiminiz icin uzgunuz. Destek ekibimiz
                    iade ve degisim sureci icin yardimci olabilir.
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
