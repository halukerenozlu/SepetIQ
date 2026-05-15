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
  /** Generic scraper always reports it can handle any URL. */
  canHandle(_url: string): boolean {
    return true;
  }

  scrape(): ScrapedProduct | null {
    const jsonLd = this.tryJsonLd();
    const og = this.tryOpenGraph();

    return {
      url: window.location.href,
      productId: `generic_${Date.now()}`,
      name:
        jsonLd?.name ??
        og?.name ??
        this.safeQueryText("h1") ??
        document.title,
      price: jsonLd?.price ?? og?.price ?? null,
      currency: jsonLd?.currency ?? og?.currency ?? "TRY",
      rating: jsonLd?.rating ?? null,
      reviewCount: jsonLd?.reviewCount ?? null,
      seller: null,
      category: null,
      imageUrl:
        og?.imageUrl ??
        this.safeQueryAttr('meta[property="og:image"]', "content"),
      specs: {},
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
