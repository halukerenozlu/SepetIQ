import { Product } from "../../types";

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "iPhone 15 Pro Max 256 GB Naturel Titanyum",
    originalPrice: 89999,
    discountedPrice: 82499,
    rating: 4.8,
    reviewCount: 1243,
    seller: "Apple Türkiye",
    categories: ["Elektronik", "Cep Telefonu", "iPhone"],
    imageUrl: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692845702708",
    specs: [
      { name: "Ekran Boyutu", value: "6.7 inç" },
      { name: "Dahili Hafıza", value: "256 GB" },
      { name: "RAM Kapasitesi", value: "8 GB" },
      { name: "Kamera Çözünürlüğü", value: "48 MP + 12 MP + 12 MP" },
      { name: "İşlemci", value: "A17 Pro" }
    ],
    reviews: [
      {
        author: "Ahmet Y.",
        rating: 5,
        date: "12 Ocak 2024",
        text: "Mükemmel bir telefon, kamerası harika. Titanyum kasa çok hafif hissettiriyor."
      },
      {
        author: "Selin K.",
        rating: 4,
        date: "5 Şubat 2024",
        text: "Batarya performansı beklediğimden biraz daha az ama genel olarak çok memnunum."
      },
      {
        author: "Mehmet T.",
        rating: 5,
        date: "20 Mart 2024",
        text: "Hızlı gönderim için teşekkürler. Ürün orijinal ve kapalı kutu geldi."
      }
    ]
  },
  {
    id: "2",
    name: "Sony WH-1000XM5 Gürültü Engelleyici Kablosuz Kulaklık",
    originalPrice: 14999,
    discountedPrice: 12499,
    rating: 4.9,
    reviewCount: 856,
    seller: "Sony Eurasia",
    categories: ["Elektronik", "Kulaklık", "Bluetooth Kulaklık"],
    imageUrl: "https://www.sony.com.tr/image/61455ca30ef88f4705534c03b137d578?fmt=p-jpg&wid=1014&hei=396&bgcolor=F1F5F1&bgc=F1F5F1",
    specs: [
      { name: "Bağlantı Tipi", value: "Bluetooth" },
      { name: "Gürültü Engelleme", value: "Var" },
      { name: "Kullanım Süresi", value: "30 Saat" },
      { name: "Mikrofon", value: "Var" }
    ],
    reviews: [
      {
        author: "Can B.",
        rating: 5,
        date: "15 Nisan 2024",
        text: "Gürültü engelleme özelliği inanılmaz. Ofis ortamında çalışırken hayat kurtarıyor."
      },
      {
        author: "Ayşe S.",
        rating: 5,
        date: "2 Mayıs 2024",
        text: "Ses kalitesi çok net. Uzun süreli kullanımda bile kulakları ağrıtmıyor."
      },
      {
        author: "Mert H.",
        rating: 4,
        date: "10 Haziran 2024",
        text: "Tasarımı biraz kaba ama performansı için değer."
      }
    ]
  },
  {
    id: "3",
    name: "Xiaomi Mi Smart Air Fryer 3.5L Yağsız Fritöz",
    originalPrice: 3499,
    discountedPrice: 2899,
    rating: 4.7,
    reviewCount: 3450,
    seller: "Xiaomi Türkiye",
    categories: ["Ev Aletleri", "Mutfak", "Fritöz"],
    imageUrl: "https://i01.appmifile.com/webfile/globalimg/products/pc/mi-smart-air-fryer-3-5l/specs-01.jpg",
    specs: [
      { name: "Güç", value: "1500 W" },
      { name: "Kapasite", value: "3.5 L" },
      { name: "Program Sayısı", value: "8" },
      { name: "Wi-Fi", value: "Var" }
    ],
    reviews: [
      {
        author: "Fatma G.",
        rating: 5,
        date: "1 Ocak 2024",
        text: "Az yağla harika patatesler kızartıyor. Temizliği de çok kolay."
      },
      {
        author: "Emre D.",
        rating: 5,
        date: "20 Şubat 2024",
        text: "Mi Home uygulaması ile telefondan kontrol edebilmek çok pratik."
      },
      {
        author: "Zeynep L.",
        rating: 4,
        date: "15 Mart 2024",
        text: "Hacmi 4 kişilik bir aile için biraz küçük kalabilir ama 2 kişi için ideal."
      }
    ]
  },
  {
    id: "4",
    name: "Apple Watch Series 9 41mm Gece Yarısı",
    originalPrice: 16999.00,
    discountedPrice: 14999.00,
    rating: 4.6,
    reviewCount: 892,
    seller: "Apple Türkiye",
    categories: ["Elektronik", "Akıllı Saat", "Apple Watch"],
    imageUrl: "https://placehold.co/600x600/1a1a1a/white?text=Apple+Watch",
    specs: [
      { name: "Ekran", value: "41mm OLED" },
      { name: "Batarya", value: "18 saat" },
      { name: "Su direnci", value: "50m" },
      { name: "GPS", value: "var" },
      { name: "Chip", value: "S9" },
      { name: "Renk", value: "Gece Yarısı" }
    ],
    reviews: [
      {
        author: "Ali Y.",
        rating: 3,
        date: "10 Mayıs 2024",
        text: "18 saatte bitiyor, gece şarj etmeyi unutursanız sabah boş."
      },
      {
        author: "Buse C.",
        rating: 2,
        date: "12 Mayıs 2024",
        text: "Pil ömrü gerçekten kısa, her gece şarj etmek zorunda kalıyorsunuz."
      },
      {
        author: "Deniz A.",
        rating: 5,
        date: "15 Mayıs 2024",
        text: "Tasarım ve performansı harika. Uygulamalar çok hızlı çalışıyor."
      },
      {
        author: "Cem K.",
        rating: 4,
        date: "18 Mayıs 2024",
        text: "Sağlık takibi özellikleri çok başarılı, motivasyon sağlıyor."
      },
      {
        author: "Elif B.",
        rating: 4,
        date: "20 Mayıs 2024",
        text: "Bildirimler ve çağrılar için çok kullanışlı. Bileğimdeki küçük bir bilgisayar gibi."
      }
    ]
  },
  {
    id: "5",
    name: "La Mer Moisturizing Cream 60ml",
    originalPrice: 14999.00,
    discountedPrice: 14999.00,
    rating: 4.8,
    reviewCount: 234,
    seller: "Sephora",
    categories: ["Kozmetik", "Cilt Bakımı", "Nemlendirici"],
    imageUrl: "https://placehold.co/600x600/c8a96e/white?text=La+Mer",
    specs: [
      { name: "İçerik", value: "60ml" },
      { name: "Cilt tipi", value: "Tüm cilt tipleri" },
      { name: "Kullanım", value: "Gece/Gündüz" },
      { name: "Koku", value: "Hafif deniz" },
      { name: "Paraben", value: "içermez" }
    ],
    reviews: [
      {
        author: "Gizem S.",
        rating: 5,
        date: "1 Nisan 2024",
        text: "Cildime çok iyi geldi, nemlendirmesi harika. Parlaklık verdi."
      },
      {
        author: "Ozan T.",
        rating: 4,
        date: "5 Nisan 2024",
        text: "Çok pahalı olmasına rağmen etkisini gördüm. Ama bütçeyi zorluyor."
      },
      {
        author: "Pınar E.",
        rating: 5,
        date: "10 Nisan 2024",
        text: "Küçük bir miktar bile yeterli oluyor, uzun süre kullanılabiliyor."
      },
      {
        author: "Barış G.",
        rating: 3,
        date: "15 Nisan 2024",
        text: "Fiyatı çok yüksek, benzer etkiyi daha uygun fiyatlı alternatiflerle de alabilirsiniz."
      },
      {
        author: "Serap M.",
        rating: 4,
        date: "20 Nisan 2024",
        text: "Muhteşem bir ürün, cildimi ipeksi yaptı. Tek eksiği fiyatı."
      }
    ]
  }
];
