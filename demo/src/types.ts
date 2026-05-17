export interface Seller {
  ad: string;
  puan: number;
  konum: string;
}

export interface Review {
  yazar: string;
  puan: number;
  tarih: string;
  metin: string;
}

export interface Product {
  id: string;
  slug: string;
  ad: string;
  fiyat: number;
  aciklama: string;
  ozellikler: string[];
  gorselUrl: string;
  ortalamaPuan: number;
  satici: Seller;
  yorumlar: Review[];
}
