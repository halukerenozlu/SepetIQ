/**
 * PRODUCT TYPES
 * Ürün ile ilgili temel tip tanımlamaları
 */

export interface ProductSpec {
  name: string;
  value: string;
}

export interface Review {
  author: string;
  rating: number;
  date: string;
  text: string;
}

export interface Product {
  id: string;
  name: string;
  originalPrice: number;
  discountedPrice: number;
  rating: number;
  reviewCount: number;
  seller: string;
  categories: string[];
  imageUrl: string;
  specs: ProductSpec[];
  reviews: Review[];
}

/**
 * USER & SESSION TYPES
 * Kullanıcı ve oturum yönetimi tipleri (Gelecek kullanım için hazır)
 */

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

/**
 * API & RESPONSE TYPES
 * Backend servislerinden dönen yanıt tipleri
 */

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}
