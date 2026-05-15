import { notFound } from "next/navigation";
import { mockProducts } from "../../data/mockProducts";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = mockProducts.find((p) => p.id === id);

  if (!product) {
    notFound();
  }

  const formatPrice = (price: number) => {
    return (
      new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: 2,
      })
        .format(price)
        .replace("₺", "")
        .trim() + " TL"
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fake Trendyol Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-[#f27a1a] font-bold text-2xl tracking-tighter">
              Trendyol
              <span className="text-gray-800 text-sm font-normal ml-1 italic">
                clone for test
              </span>
            </div>
            <div className="hidden md:flex items-center bg-gray-100 rounded-md px-3 py-2 w-96">
              <input
                type="text"
                placeholder="Aradığınız ürün, kategori veya markayı yazınız"
                className="bg-transparent border-none outline-none text-sm w-full"
                readOnly
              />
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
            <span>Giriş Yap</span>
            <span>Favorilerim</span>
            <div className="flex items-center gap-1">
              <span>Sepetim</span>
              <span className="bg-[#f27a1a] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                0
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white border-b hidden md:block">
          <div className="max-w-7xl mx-auto px-4 flex gap-6 py-2 text-xs font-bold uppercase text-gray-700">
            <span>Kadın</span>
            <span>Erkek</span>
            <span>Anne & Çocuk</span>
            <span>Ev & Yaşam</span>
            <span>Süpermarket</span>
            <span>Kozmetik</span>
            <span>Ayakkabı & Çanta</span>
            <span className="text-[#f27a1a]">Elektronik</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Breadcrumb - Critical for scraper */}
        <div className="breadcrumb flex items-center gap-1 text-xs text-gray-500 mb-4">
          {product.categories.map((cat, index) => (
            <div key={index} className="flex items-center gap-1">
              <span>{cat}</span>
              {index < product.categories.length - 1 && <span>{">"}</span>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col md:flex-row gap-8">
          {/* Product Image - Critical for scraper */}
          <div className="md:w-1/2 flex justify-center items-start">
            <div className="base-product-image relative w-full aspect-square max-w-125 border rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrl}
                alt={product.name}
                className="object-contain w-full h-full"
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="md:w-1/2 flex flex-col gap-4">
            {/* Product Name - Critical for scraper */}
            <h1 className="pr-new-br text-xl font-medium">
              <span className="font-bold mr-2">{product.seller}</span>
              <span className="text-gray-800">{product.name}</span>
            </h1>

            {/* Rating and Review Count - Critical for scraper */}
            <div className="flex items-center gap-4 text-sm">
              <div className="rating-line-count flex items-center gap-1">
                <span className="tlp-text text-orange-500 font-bold">
                  {product.rating}
                </span>
                <div className="flex text-orange-500">
                  {[...Array(5)].map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
              </div>
              <div className="text-gray-400">|</div>
              <span className="rvw-cnt-tx text-blue-600 font-medium cursor-pointer">
                {product.reviewCount} değerlendirme
              </span>
            </div>

            {/* Prices - Critical for scraper */}
            <div className="flex flex-col gap-1 py-4 border-y">
              <span className="prc-org text-sm text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
              <div className="flex items-center gap-2">
                <span className="prc-dsc text-3xl font-bold text-[#f27a1a]">
                  {formatPrice(product.discountedPrice)}
                </span>
                <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-sm font-bold">
                  %
                  {Math.round(
                    ((product.originalPrice - product.discountedPrice) /
                      product.originalPrice) *
                      100,
                  )}{" "}
                  İndirim
                </span>
              </div>
            </div>

            {/* Seller Info - Critical for scraper */}
            <div className="text-sm">
              <span className="text-gray-500">Satıcı: </span>
              <a
                href="#"
                className="merchant-text text-blue-600 font-medium hover:underline"
              >
                {product.seller}
              </a>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 mt-4">
              <button className="flex-1 bg-[#f27a1a] text-white font-bold py-4 rounded-lg hover:bg-[#e67317] transition-colors">
                Sepete Ekle
              </button>
              <button className="w-12 h-12 border rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                ❤
              </button>
            </div>
          </div>
        </div>

        {/* Product Specs - Critical for scraper */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Ürün Özellikleri</h2>
          <ul className="detail-attr-container grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.specs.map((spec, index) => (
              <li key={index} className="flex border-b pb-2">
                <span className="attr-name font-bold text-gray-600 w-1/3">
                  {spec.name}:
                </span>
                <span className="attr-value text-gray-800 w-2/3">
                  {spec.value}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Fake Reviews */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">
            Ürün Değerlendirmeleri ({product.reviewCount})
          </h2>
          <div className="flex flex-col gap-6">
            {product.reviews.map((review, index) => (
              <div key={index} className="border-b pb-6 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex text-orange-500 text-sm">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>{i < review.rating ? "★" : "☆"}</span>
                    ))}
                  </div>
                  <span className="text-xs font-bold">{review.author}</span>
                  <span className="text-xs text-gray-400">| {review.date}</span>
                </div>
                <p className="text-sm text-gray-700">{review.text}</p>
                <div className="mt-2 text-xs text-green-600 font-medium">
                  ✓ Satın aldığı satıcı: {product.seller}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Fake Footer */}
      <footer className="bg-zinc-900 text-white py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold mb-4">Trendyol</h3>
            <ul className="text-sm text-gray-400 flex flex-col gap-2">
              <li>Biz kimiz?</li>
              <li>Kariyer</li>
              <li>İletişim</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Kampanyalar</h3>
            <ul className="text-sm text-gray-400 flex flex-col gap-2">
              <li>Aktif Kampanyalar</li>
              <li>Elite Üyelik</li>
              <li>Hediye Fikirleri</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Yardım</h3>
            <ul className="text-sm text-gray-400 flex flex-col gap-2">
              <li>Sıkça Sorulan Sorular</li>
              <li>Canlı Yardım</li>
              <li>İşlem Rehberi</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Sosyal Medya</h3>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-zinc-800 rounded-full"></div>
              <div className="w-8 h-8 bg-zinc-800 rounded-full"></div>
              <div className="w-8 h-8 bg-zinc-800 rounded-full"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
