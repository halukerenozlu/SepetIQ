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

export interface ProductScenario {
  id: string;
  demoGoal: string;
  trigger: string;
  expectedVerdict: "buy" | "conditional_buy" | "wait" | "dont_buy";
  riskSignals: string[];
  storefrontSignals: string[];
  stockLabel: string;
  couponLabel: string;
  shippingLabel: string;
  returnLabel: string;
  viewCountLabel: string;
}

export interface Product {
  id: string;
  slug: string;
  ad: string;
  kategori: string;
  fiyat: number;
  aciklama: string;
  ozellikler: string[];
  gorselUrl: string;
  ortalamaPuan: number;
  satici: Seller;
  yorumlar: Review[];
  scenario: ProductScenario;
}

export interface DemoPurchase {
  id: string;
  productName: string;
  category: string;
  monthsAgo: number;
  usage: "never" | "rarely" | "sometimes" | "often" | "daily";
  satisfaction: "regretted" | "neutral" | "satisfied";
  price: number;
}

export interface DemoCustomer {
  id: string;
  name: string;
  city: string;
  defaultMode: "soft" | "balanced" | "strict";
  monthlyBudget: number;
  spentThisMonth: number;
  coupons: number;
  cartCount: number;
  traits: string[];
  recentViews: string[];
  purchases: DemoPurchase[];
}
