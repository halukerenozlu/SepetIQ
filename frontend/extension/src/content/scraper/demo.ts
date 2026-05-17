/**
 * content/scraper/demo.ts - Local demo product page scraper
 *
 * Uses stable data-* attributes added to the demo storefront.
 */

import { BaseScraper } from "./base";
import type { ScrapedProduct } from "../../shared/types";

export class DemoScraper extends BaseScraper {
  canHandle(url: string): boolean {
    return (
      url.startsWith("http://localhost:3001/product/") ||
      Boolean(document.querySelector("[data-product-name]"))
    );
  }

  scrape(): ScrapedProduct | null {
    try {
      const productId = this.extractProductId();

      return {
        url: window.location.href,
        productId,
        product_id: productId,
        name: this.extractProductName(),
        price: this.extractPrice(),
        currency: "TRY",
        rating: this.extractRating(),
        reviewCount: this.extractReviews().length,
        review_count: this.extractReviews().length,
        seller: this.safeQueryText("[data-product-seller]") ?? "SepetIQ Demo Store",
        category: this.extractCategory(),
        imageUrl: this.safeQueryAttr("[data-product-image]", "src"),
        image_url: this.safeQueryAttr("[data-product-image]", "src"),
        specs: this.extractSpecs(),
        reviews: this.extractReviews(),
        scrapedAt: new Date().toISOString(),
        source: "demo",
      };
    } catch {
      return null;
    }
  }

  private extractProductId(): string {
    const match = window.location.pathname.match(/\/product\/([^/?#]+)/);
    return match?.[1] ?? `demo_${Date.now()}`;
  }

  private extractProductName(): string | null {
    return this.safeQueryText("[data-product-name]") ?? this.safeQueryText("h1");
  }

  private extractPrice(): number | null {
    const priceText = this.safeQueryText("[data-product-price]");
    return priceText ? this.parsePrice(priceText) : null;
  }

  private extractRating(): number | null {
    const reviews = this.extractReviews();

    if (reviews.length === 0) return null;

    const total = reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0);
    return Number((total / reviews.length).toFixed(1));
  }

  private extractCategory(): string | null {
    return "Elektronik";
  }

  private extractSpecs(): Record<string, string> {
    const specs: Record<string, string> = {};
    const description = this.safeQueryText("[data-product-description]");

    if (description) specs.description = description;

    document.querySelectorAll("[data-product-spec]").forEach((item, index) => {
      const value = item.textContent?.trim();
      if (value) specs[`feature_${index + 1}`] = value;
    });

    return specs;
  }

  private extractReviews() {
    const reviewBlocks = document.querySelectorAll("[data-review]");

    return Array.from(reviewBlocks)
      .slice(0, 15)
      .map((item) => {
        const ratingText = item.getAttribute("data-review-rating") ?? "";
        const rating = parseInt(ratingText, 10);
        const text = item.querySelector("[data-review-text]")?.textContent?.trim() ?? "";
        const author = item.querySelector("[data-review-author]")?.textContent?.trim() ?? null;
        const date = item.querySelector("[data-review-date]")?.textContent?.trim() ?? null;
        const verifiedText = item.textContent?.toLocaleLowerCase("tr-TR") ?? "";

        return {
          author,
          rating: Number.isNaN(rating) ? null : rating,
          text,
          date,
          verified_buyer: verifiedText.includes("doğrulandı"),
        };
      })
      .filter((review) => review.text.length > 0);
  }
}
