/**
 * content/scraper/generic.ts — Fallback generic scraper
 *
 * Extraction priority:
 *   1. JSON-LD <script type="application/ld+json"> with @type = "Product"
 *   2. OpenGraph meta tags (og:title, og:price:amount, og:image)
 *   3. Common CSS selectors as last resort
 *
 * Always returns partial data rather than null —
 * the backend can work with incomplete product info.
 */

import { BaseScraper } from "./base";
import type { ScrapedProduct } from "../../shared/types";

// Minimal subset of Schema.org Product we care about
interface JsonLdProduct {
  "@type": string;
  name?: string;
  description?: string;
  offers?:
    | JsonLdOffer
    | JsonLdOffer[];
  aggregateRating?: {
    ratingValue?: string | number;
    reviewCount?: string | number;
  };
}

interface JsonLdOffer {
  price?: string | number;
  priceCurrency?: string;
}

// Partial data gathered from each source
interface PartialData {
  name?: string;
  price?: number | null;
  currency?: string;
  rating?: number | null;
  reviewCount?: number | null;
  imageUrl?: string;
}

export class GenericScraper extends BaseScraper {
  /**
   * Only activate when the page has a clear product signal AND the host is
   * a known shopping site. Prevents the FAB from appearing on cart,
   * checkout, listing pages, and any non-shopping site that happens to
   * include Product structured data (blogs, reviews, etc.).
   */
  canHandle(): boolean {
    if (!this.isShoppingHost()) return false;
    return (
      this.hasJsonLdProduct() ||
      this.hasOpenGraphProduct() ||
      this.hasMicrodataProduct()
    );
  }

  override getAddToCartSelectors(): string[] {
    return [
      "#add-to-cart-button",
      'input[name="submit.add-to-cart"]',
      '[data-testid="x-atc-action"]',
      "#atcRedesignId_btn",
      "#binBtn_btn",
      ".btnAddBasket",
      'button[class*="addBasket"]',
      'button[id*="add-to-cart"]',
      'button[class*="add-to-cart"]',
      'button[class*="addToCart"]',
    ];
  }

  private isShoppingHost(): boolean {
    const host = window.location.hostname.toLowerCase();
    const SHOPPING_HOSTS = [
      "trendyol.com",
      "amazon.com.tr",
      "hepsiburada.com",
      "n11.com",
    ];
    if (SHOPPING_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
      return true;
    }
    return false;
  }

  private hasJsonLdProduct(): boolean {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        const data = JSON.parse(script.textContent ?? "{}") as { "@type"?: string };
        if (data["@type"] === "Product") return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  private hasOpenGraphProduct(): boolean {
    const ogType = document.querySelector<HTMLMetaElement>(
      'meta[property="og:type"]',
    )?.content;
    return ogType === "product" || ogType === "og:product";
  }

  private hasMicrodataProduct(): boolean {
    return Boolean(
      document.querySelector('[itemtype*="schema.org/Product"]'),
    );
  }

  scrape(): ScrapedProduct | null {
    const jsonLd = this.tryJsonLd();
    const og = this.tryOpenGraph();
    const productId = `generic_${Date.now()}`;

    return {
      url: window.location.href,
      productId,
      product_id: productId,
      name:
        jsonLd?.name ??
        og?.name ??
        this.safeQueryText("h1") ??
        document.title,
      price: jsonLd?.price ?? og?.price ?? null,
      currency: jsonLd?.currency ?? og?.currency ?? "TRY",
      rating: jsonLd?.rating ?? null,
      reviewCount: jsonLd?.reviewCount ?? null,
      review_count: jsonLd?.reviewCount ?? null,
      seller: null,
      category: null,
      imageUrl:
        og?.imageUrl ??
        this.safeQueryAttr('meta[property="og:image"]', "content"),
      image_url:
        og?.imageUrl ??
        this.safeQueryAttr('meta[property="og:image"]', "content"),
      specs: {},
      reviews: [],
      scrapedAt: new Date().toISOString(),
      source: "generic",
    };
  }

  // ─── Source: JSON-LD structured data ─────────────────────────────────────

  private tryJsonLd(): PartialData | null {
    try {
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      for (const script of scripts) {
        const raw = JSON.parse(script.textContent ?? "{}") as JsonLdProduct;
        if (raw["@type"] !== "Product") continue;

        const offer = Array.isArray(raw.offers)
          ? raw.offers[0]
          : raw.offers;

        const priceStr = offer?.price?.toString();
        const price = priceStr ? this.parsePrice(priceStr) : null;

        const ratingRaw = raw.aggregateRating?.ratingValue;
        const rating = ratingRaw ? parseFloat(ratingRaw.toString()) : null;

        const reviewRaw = raw.aggregateRating?.reviewCount;
        const reviewCount = reviewRaw
          ? parseInt(reviewRaw.toString(), 10)
          : null;

        return {
          name: raw.name,
          price,
          currency: offer?.priceCurrency ?? "TRY",
          rating: isNaN(rating ?? NaN) ? null : rating,
          reviewCount: isNaN(reviewCount ?? NaN) ? null : reviewCount,
        };
      }
    } catch {
      // ignore parse errors
    }
    return null;
  }

  // ─── Source: OpenGraph meta tags ──────────────────────────────────────────

  private tryOpenGraph(): PartialData | null {
    const getMeta = (property: string): string | null =>
      document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
        ?.content ?? null;

    const name = getMeta("og:title");
    const priceStr =
      getMeta("og:price:amount") ?? getMeta("product:price:amount");
    const price = priceStr ? this.parsePrice(priceStr) : null;
    const currency =
      getMeta("og:price:currency") ??
      getMeta("product:price:currency") ??
      "TRY";
    const imageUrl = getMeta("og:image");

    if (!name && price === null) return null;

    return {
      name: name ?? undefined,
      price,
      currency,
      imageUrl: imageUrl ?? undefined,
    };
  }
}
