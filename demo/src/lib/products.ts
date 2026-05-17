import rawProducts from "../data/products.json";
import type { Product } from "../types";

export const products = rawProducts as Product[];

export function findProductBySlug(slug: string | undefined): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
