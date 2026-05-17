import { Link, useParams } from "react-router-dom";
import { Stars } from "../components/Stars";
import { findProductBySlug, formatCurrency, formatDate } from "../lib/products";

export function ProductDetail() {
  const { slug } = useParams();
  const product = findProductBySlug(slug);

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20">
        <h1 className="text-3xl font-black">Ürün bulunamadı</h1>
        <Link to="/" className="mt-6 inline-flex font-bold text-emerald-700">
          Vitrine dön
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Link to="/" className="mb-6 inline-flex text-sm font-bold text-zinc-500 hover:text-zinc-900">
        Vitrine dön
      </Link>

      <article className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-[8px] border border-zinc-200 bg-white">
          <img
            src={product.gorselUrl}
            alt="main image"
            className="aspect-square h-full w-full object-cover"
            data-product-image
          />
        </div>

        <aside className="self-start rounded-[8px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="border-b border-zinc-200 pb-5">
            <p className="text-sm font-bold text-emerald-700">Elektronik</p>
            <h1
              className="mt-2 text-3xl font-black leading-tight tracking-tight text-zinc-950"
              data-product-name
            >
              {product.ad}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <Stars value={product.ortalamaPuan} />
              <span className="text-sm text-zinc-500">
                {product.yorumlar.length} yorum
              </span>
            </div>
          </div>

          <div className="space-y-5 py-5">
            <div
              className="text-4xl font-black tracking-tight text-zinc-950"
              data-product-price
            >
              {formatCurrency(product.fiyat)}
            </div>
            <div className="rounded-[8px] bg-zinc-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                Satıcı
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-extrabold text-zinc-950" data-product-seller>
                    {product.satici.ad}
                  </p>
                  <p className="text-sm text-zinc-500">{product.satici.konum}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800">
                  {product.satici.puan.toFixed(1)}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="h-12 w-full rounded-[8px] bg-orange-600 text-base font-black text-white transition hover:bg-orange-700 active:scale-[0.99]"
            >
              Sepete Ekle
            </button>
          </div>

          <div className="border-t border-zinc-200 pt-5">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">
              Ürün bilgisi
            </h2>
            <p className="mt-3 leading-7 text-zinc-700" data-product-description>
              {product.aciklama}
            </p>
          </div>
        </aside>
      </article>

      <section className="mt-10 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Öne çıkan özellikler</h2>
          <ul className="mt-5 space-y-3" data-product-specs>
            {product.ozellikler.map((feature) => (
              <li
                key={feature}
                className="rounded-[8px] border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700"
                data-product-spec
              >
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-end justify-between gap-4 border-b border-zinc-200 pb-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Yorumlar</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Olumlu, olumsuz, nötr ve şüpheli örnekler
              </p>
            </div>
            <Stars value={product.ortalamaPuan} />
          </div>

          <div className="divide-y divide-zinc-200">
            {product.yorumlar.map((review) => (
              <article
                key={`${review.yazar}-${review.tarih}`}
                className="py-5"
                data-review
                data-review-rating={review.puan}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-zinc-950" data-review-author>
                      {review.yazar}
                    </p>
                    <p className="text-sm text-zinc-500" data-review-date>
                      {formatDate(review.tarih)}
                    </p>
                  </div>
                  <Stars value={review.puan} label={`${review.puan} yıldız`} />
                </div>
                <p className="mt-3 leading-7 text-zinc-700" data-review-text>
                  {review.metin}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
