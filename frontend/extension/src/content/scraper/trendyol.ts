/**
 * content/scraper/trendyol.ts — Trendyol product page scraper
 *
 * NOTE: Trendyol frequently changes their DOM structure.
 * Every selector uses safe utility methods — missing elements return null,
 * never crash.
 *
 * Tested selectors as of May 2026:
 *   Name        : h1.pr-new-br, .pr-new-br span
 *   Price       : .prc-dsc (discounted), .prc-org (original)
 *   Rating      : .rating-line-count .tlp-text, .pr-rnr-sm-txt
 *   Reviews     : .rvw-cnt-tx
 *   Seller      : .merchant-text
 *   Breadcrumb  : .breadcrumb span
 *   Image       : .base-product-image img, picture source
 *   Specs       : .detail-attr-container li
 */

import { BaseScraper } from "./base";
import type { ScrapedProduct } from "../../shared/types";

interface TrendyolJsonLdProduct {
  name?: string;
  aggregateRating?: {
    ratingValue?: string | number;
    reviewCount?: string | number;
    ratingCount?: string | number;
  };
}

interface TrendyolJsonLdOffer {
  price?: string | number;
  priceCurrency?: string;
}

export class TrendyolScraper extends BaseScraper {
  canHandle(url: string): boolean {
    return (
      url.includes("trendyol.com") ||
      Boolean(document.querySelector(".pr-new-br, .prc-dsc, .merchant-text"))
    );
  }

  override getAddToCartSelectors(): string[] {
    return [
      ".add-to-basket",
      ".pdp-add-to-basket",
      'button[class*="add-to-basket"]',
      'button[class*="AddToBasket"]',
      'button[data-testid="add-to-cart-button"]',
    ];
  }

  scrape(): ScrapedProduct | null {
    try {
      const product = this.getJsonLdProduct();
      const offer = this.getJsonLdOffer(product);
      const productId = this.extractProductId();
      const reviewCount = this.extractReviewCount(product);
      const imageUrl = this.extractImageUrl(product);
      return {
        url: window.location.href,
        productId,
        product_id: productId,
        name: this.extractProductName(product),
        price: this.extractPrice(offer),
        currency: offer?.priceCurrency ?? "TRY",
        rating: this.extractRating(product),
        reviewCount,
        review_count: reviewCount,
        seller: this.safeQueryText(".merchant-text"),
        category: this.extractCategory(),
        imageUrl,
        image_url: imageUrl,
        specs: this.extractSpecs(),
        reviews: this.extractReviews(),
        scrapedAt: new Date().toISOString(),
        source: "trendyol",
      };
    } catch {
      return null;
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private extractProductId(): string {
    // URL pattern: /p-123456789
    const trendyolMatch = window.location.pathname.match(/p-(\d+)/);
    if (trendyolMatch?.[1]) return trendyolMatch[1];

    // Local demo pattern: /product/2
    const demoMatch = window.location.pathname.match(/\/product\/([^/?#]+)/);
    return demoMatch?.[1] ?? `trendyol_${Date.now()}`;
  }

  private extractProductName(product: TrendyolJsonLdProduct | null): string | null {
    const heading = document.querySelector("h1.pr-new-br");
    const seller = this.safeQueryText(".merchant-text");

    if (!heading) {
      return (
        this.safeQueryText(".pr-new-br span") ??
        product?.name?.trim() ??
        this.getMetaContent(
          'meta[property="og:title"]',
          'meta[name="title"]',
          'meta[name="twitter:title"]',
        )
      );
    }

    const childTexts = Array.from(heading.childNodes)
      .map((node) => node.textContent?.trim())
      .filter((text): text is string => Boolean(text));

    const combined = (childTexts.length > 1 ? childTexts.join(" ") : heading.textContent)
      ?.replace(/\s+/g, " ")
      .trim();

    if (!combined) return null;

    if (seller && combined.startsWith(seller)) {
      const productName = combined.slice(seller.length).trim();
      return productName ? `${seller} - ${productName}` : combined;
    }

    return combined;
  }

  private extractPrice(offer: TrendyolJsonLdOffer | null): number | null {
    if (offer?.price !== undefined) {
      const parsed = this.parsePrice(String(offer.price));
      if (parsed !== null) return parsed;
    }

    const discounted = this.safeQueryText(".prc-dsc");
    if (discounted) return this.parsePrice(discounted);

    const original = this.safeQueryText(".prc-org");
    if (original) return this.parsePrice(original);

    // Fallback: look for any element containing "TL"
    const anyPrice = this.safeQueryText("[class*='prc']");
    if (anyPrice && anyPrice.includes("TL")) return this.parsePrice(anyPrice);

    const metaPrice = this.getMetaContent('meta[property="product:price:amount"]');
    return metaPrice ? this.parsePrice(metaPrice) : null;
  }

  private extractRating(product: TrendyolJsonLdProduct | null): number | null {
    const jsonLdRating = product?.aggregateRating?.ratingValue;
    if (jsonLdRating !== undefined) {
      const parsed = parseFloat(String(jsonLdRating).replace(",", "."));
      if (!Number.isNaN(parsed)) return parsed;
    }

    const ratingText =
      this.safeQueryText(".rating-line-count .tlp-text") ??
      this.safeQueryText(".pr-rnr-sm-txt") ??
      this.safeQueryText("[class*='rating-score']");

    if (!ratingText) return null;
    const num = parseFloat(ratingText.replace(",", "."));
    return isNaN(num) ? null : num;
  }

  private extractReviewCount(product: TrendyolJsonLdProduct | null): number | null {
    const jsonLdCount =
      product?.aggregateRating?.reviewCount ?? product?.aggregateRating?.ratingCount;
    if (jsonLdCount !== undefined) {
      const parsed = parseInt(String(jsonLdCount), 10);
      if (!Number.isNaN(parsed)) return parsed;
    }

    const countText = this.safeQueryText(".rvw-cnt-tx");
    if (!countText) return null;
    const match = countText.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  private extractCategory(): string | null {
    // Try breadcrumb navigation
    const breadcrumbs = document.querySelectorAll(
      ".breadcrumb span, [class*='breadcrumb'] span",
    );
    if (breadcrumbs.length > 0) {
      const last = breadcrumbs[breadcrumbs.length - 1];
      return last.textContent?.trim() ?? null;
    }
    return null;
  }

  private extractImageUrl(product: TrendyolJsonLdProduct | null): string | null {
    return (
      this.readJsonLdImage(product) ??
      this.safeQueryAttr(".base-product-image img", "src") ??
      this.safeQueryAttr("picture source", "srcset") ??
      this.getMetaContent('meta[property="og:image"]')
    );
  }

  private extractSpecs(): Record<string, string> {
    const specs: Record<string, string> = {};
    const items = document.querySelectorAll(
      ".detail-attr-container li, .detail-attr-item",
    );
    items.forEach((item) => {
      const key = item
        .querySelector(".attribute-name, [class*='attr-name']")
        ?.textContent?.trim();
      const value = item
        .querySelector(".attribute-value, [class*='attr-value']")
        ?.textContent?.trim();
      if (key && value) specs[key] = value;
    });
    return specs;
  }

  private extractReviews() {
    const reviewBlocks = document.querySelectorAll(
      ".comment-card, [data-testid*='review'], .reviews .review, .border-b.pb-6",
    );

    return Array.from(reviewBlocks)
      .slice(0, 15)
      .map((item) => {
        const text =
          item.querySelector("p")?.textContent?.trim() ??
          item.querySelector(".comment-text, [class*='comment']")?.textContent?.trim() ??
          "";
        const ratingText =
          item.querySelector("[data-rating]")?.getAttribute("data-rating") ??
          item.querySelector("[class*='star']")?.textContent ??
          "";
        const filledStars = (ratingText.match(/★/g) ?? []).length;
        const rating = parseInt(ratingText, 10);

        return {
          rating: Number.isNaN(rating) ? (filledStars || null) : rating,
          text,
          date:
            item.querySelector(".comment-date, [class*='date']")?.textContent?.trim() ??
            null,
          verified_buyer:
            item.textContent?.toLocaleLowerCase("tr-TR").includes("satın aldığı") ??
            false,
        };
      })
      .filter((review) => review.text.length > 0);
  }
}
