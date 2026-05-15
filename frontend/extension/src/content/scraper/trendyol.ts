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

export class TrendyolScraper extends BaseScraper {
  canHandle(url: string): boolean {
    return url.includes("trendyol.com");
  }

  scrape(): ScrapedProduct | null {
    try {
      return {
        url: window.location.href,
        productId: this.extractProductId(),
        name:
          this.safeQueryText("h1.pr-new-br") ??
          this.safeQueryText(".pr-new-br span"),
        price: this.extractPrice(),
        currency: "TRY",
        rating: this.extractRating(),
        reviewCount: this.extractReviewCount(),
        seller: this.safeQueryText(".merchant-text"),
        category: this.extractCategory(),
        imageUrl:
          this.safeQueryAttr(".base-product-image img", "src") ??
          this.safeQueryAttr("picture source", "srcset"),
        specs: this.extractSpecs(),
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
    const match = window.location.pathname.match(/p-(\d+)/);
    return match?.[1] ?? `trendyol_${Date.now()}`;
  }

  private extractPrice(): number | null {
    const discounted = this.safeQueryText(".prc-dsc");
    if (discounted) return this.parsePrice(discounted);

    const original = this.safeQueryText(".prc-org");
    if (original) return this.parsePrice(original);

    // Fallback: look for any element containing "TL"
    const anyPrice = this.safeQueryText("[class*='prc']");
    if (anyPrice && anyPrice.includes("TL")) return this.parsePrice(anyPrice);

    return null;
  }

  private extractRating(): number | null {
    const ratingText =
      this.safeQueryText(".rating-line-count .tlp-text") ??
      this.safeQueryText(".pr-rnr-sm-txt") ??
      this.safeQueryText("[class*='rating-score']");

    if (!ratingText) return null;
    const num = parseFloat(ratingText.replace(",", "."));
    return isNaN(num) ? null : num;
  }

  private extractReviewCount(): number | null {
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
}
