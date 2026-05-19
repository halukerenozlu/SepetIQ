/**
 * content/scraper/base.ts — Abstract base scraper
 *
 * Provides shared DOM utility methods.
 * Each site-specific scraper extends this class.
 */

import type { ScrapedProduct } from "../../shared/types";

export type { ScrapedProduct };

interface JsonLdNode {
  "@type"?: string | string[];
  "@graph"?: JsonLdNode[];
  name?: string;
  description?: string;
  image?: string | string[] | { url?: string } | Array<{ url?: string }>;
  brand?: string | { name?: string };
  sku?: string;
  productID?: string;
  offers?:
    | {
        price?: string | number;
        priceCurrency?: string;
        availability?: string;
      }
    | Array<{
        price?: string | number;
        priceCurrency?: string;
        availability?: string;
      }>;
  aggregateRating?: {
    ratingValue?: string | number;
    reviewCount?: string | number;
    ratingCount?: string | number;
  };
}

interface JsonLdOfferNode {
  price?: string | number;
  priceCurrency?: string;
  availability?: string;
}

export abstract class BaseScraper {
  /** Returns true if this scraper can handle the given URL. */
  abstract canHandle(url: string): boolean;

  /**
   * Scrapes the current page and returns product data.
   * Returns null if the page is not a recognized product page.
   */
  abstract scrape(): ScrapedProduct | null;

  /**
   * CSS selectors for the site's "Add to Cart" button(s).
   * Used by the content script to auto-trigger analysis on click.
   * Override per-site. Empty list = no auto-trigger.
   */
  getAddToCartSelectors(): string[] {
    return [];
  }

  // ─── DOM utilities ─────────────────────────────────────────────────────────

  /** Safely queries a selector and returns its textContent, or null. */
  protected safeQueryText(selector: string): string | null {
    try {
      const el = document.querySelector(selector);
      const text = el?.textContent?.trim();
      return text ?? null;
    } catch {
      return null;
    }
  }

  /** Safely queries a selector and returns an attribute value, or null. */
  protected safeQueryAttr(selector: string, attr: string): string | null {
    try {
      const el = document.querySelector(selector);
      const value = el?.getAttribute(attr);
      return value ?? null;
    } catch {
      return null;
    }
  }

  protected getMetaContent(...selectors: string[]): string | null {
    for (const selector of selectors) {
      const content = this.safeQueryAttr(selector, "content");
      if (content) return content.trim();
    }
    return null;
  }

  protected getJsonLdProducts(): JsonLdNode[] {
    const products: JsonLdNode[] = [];
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

    scripts.forEach((script) => {
      const parsed = this.parseJson(script.textContent ?? "");
      if (!parsed) return;
      this.collectJsonLdProducts(parsed, products);
    });

    return products;
  }

  protected getJsonLdProduct(): JsonLdNode | null {
    return this.getJsonLdProducts()[0] ?? null;
  }

  protected getJsonLdOffer(product: JsonLdNode | null): JsonLdOfferNode | null {
    const offers = product?.offers;
    if (!offers) return null;
    return Array.isArray(offers) ? offers[0] : offers;
  }

  protected readJsonLdImage(product: JsonLdNode | null): string | null {
    const image = product?.image;
    if (!image) return null;
    if (typeof image === "string") return image;
    if (Array.isArray(image)) {
      const first = image[0];
      return typeof first === "string" ? first : first?.url ?? null;
    }
    return image.url ?? null;
  }

  private parseJson(value: string): unknown | null {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private collectJsonLdProducts(value: unknown, products: JsonLdNode[]): void {
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      value.forEach((item) => this.collectJsonLdProducts(item, products));
      return;
    }

    const node = value as JsonLdNode;
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    if (types.some((type) => type?.toLowerCase() === "product")) {
      products.push(node);
    }

    node["@graph"]?.forEach((item) => this.collectJsonLdProducts(item, products));
  }

  /**
   * Parses a Turkish-formatted price string to a float.
   *
   * Examples:
   *   "12.499,00 TL"  → 12499.00
   *   "1.299 TL"      → 1299.00
   *   "999,90"        → 999.90
   */
  protected parsePrice(text: string): number | null {
    if (!text) return null;

    // Remove currency symbol and whitespace
    let cleaned = text.replace(/[^\d.,]/g, "");

    // Determine format:
    // Turkish: thousands = ".", decimal = ","  →  "12.499,00"
    // International: thousands = ",", decimal = "."  →  "12,499.00"
    if (cleaned.includes(",") && cleaned.includes(".")) {
      const lastDot = cleaned.lastIndexOf(".");
      const lastComma = cleaned.lastIndexOf(",");

      if (lastComma > lastDot) {
        // Turkish format: "12.499,00" → remove dots, replace comma
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
      } else {
        // International: "12,499.00" → remove commas
        cleaned = cleaned.replace(/,/g, "");
      }
    } else if (cleaned.includes(",")) {
      // Only comma — treat as decimal separator: "999,90" → "999.90"
      cleaned = cleaned.replace(",", ".");
    } else if (cleaned.includes(".")) {
      const parts = cleaned.split(".");
      const isTurkishThousands =
        parts.length > 1 &&
        parts.slice(1).every((part) => part.length === 3) &&
        parts[0].length >= 1 &&
        parts[0].length <= 3;

      if (isTurkishThousands) {
        // Only dots with 3-digit groups are thousands: "119.000" → "119000"
        cleaned = parts.join("");
      }
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
}
