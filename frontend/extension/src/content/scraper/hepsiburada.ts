import { BaseScraper } from "./base";
import type { ScrapedProduct } from "../../shared/types";

export class HepsiburadaScraper extends BaseScraper {
  canHandle(url: string): boolean {
    if (!url.includes("hepsiburada.com")) return false;

    return (
      /-(?:pm|p)-[A-Z0-9]+/i.test(window.location.pathname) ||
      Boolean(
        document.querySelector(
          'h1[data-test-id="title"], [data-test-id="price-current"], [itemtype*="schema.org/Product"]',
        ),
      )
    );
  }

  override getAddToCartSelectors(): string[] {
    return [
      '[data-test-id="addToCart"]',
      'button[id*="addToCart"]',
      'button[class*="addToCart"]',
      'button[class*="add-to-cart"]',
      '[data-bind*="addToCart"]',
    ];
  }

  scrape(): ScrapedProduct | null {
    try {
      const product = this.getJsonLdProduct();
      const offer = this.getJsonLdOffer(product);
      const productId = this.extractProductId();
      const reviewCount = this.extractReviewCount();
      const imageUrl = this.extractImageUrl();
      const productName = this.extractProductName() ?? product?.name?.trim() ?? null;

      if (!productName) return null;

      return {
        url: window.location.href,
        productId,
        product_id: productId,
        name: productName,
        price: this.extractPrice() ?? (offer?.price ? this.parsePrice(String(offer.price)) : null),
        currency: offer?.priceCurrency ?? "TRY",
        rating: this.extractRating(),
        reviewCount,
        review_count: reviewCount,
        seller: this.extractSeller(),
        category: this.extractCategory(),
        imageUrl,
        image_url: imageUrl,
        specs: this.extractSpecs(),
        reviews: this.extractReviews(),
        scrapedAt: new Date().toISOString(),
        source: "hepsiburada",
      };
    } catch {
      return null;
    }
  }

  private extractProductId(): string {
    // URL patterns: /product-name-pm-HBVXXX or /-p-HBVXXX
    const pmMatch = window.location.pathname.match(/pm-([A-Z0-9]+)/i);
    if (pmMatch?.[1]) return pmMatch[1];
    const pMatch = window.location.pathname.match(/-p-([A-Z0-9]+)/i);
    return pMatch?.[1] ?? `hb_${Date.now()}`;
  }

  private extractProductName(): string | null {
    return (
      this.safeQueryText('h1[data-test-id="title"]') ??
      this.safeQueryText("h1.product-name") ??
      this.safeQueryText('[class*="productName"] h1') ??
      this.safeQueryText("h1") ??
      this.getMetaContent('meta[property="og:title"]')
    );
  }

  private extractPrice(): number | null {
    const priceText =
      this.safeQueryText('[data-test-id="price-current"]') ??
      this.safeQueryText(".price-value") ??
      this.safeQueryAttr('[itemprop="price"]', "content") ??
      this.safeQueryText('[class*="currentPrice"]') ??
      this.safeQueryText('[class*="price-value"]') ??
      this.getMetaContent('meta[property="product:price:amount"]');
    return priceText ? this.parsePrice(priceText) : null;
  }

  private extractRating(): number | null {
    const ratingText =
      this.safeQueryAttr('[itemprop="ratingValue"]', "content") ??
      this.safeQueryText('[class*="rating"] strong') ??
      this.safeQueryText(".product-rating-count");
    if (!ratingText) return null;
    const num = parseFloat(ratingText.replace(",", "."));
    return isNaN(num) ? null : num;
  }

  private extractReviewCount(): number | null {
    const countText =
      this.safeQueryText('[data-test-id="reviews-count"]') ??
      this.safeQueryText('[class*="reviewCount"]') ??
      this.safeQueryText(".product-rating-text");
    if (!countText) return null;
    const match = countText.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  private extractSeller(): string | null {
    return (
      this.safeQueryText('[data-test-id="merchant-name"]') ??
      this.safeQueryText(".merchant-name") ??
      this.safeQueryText('[class*="sellerName"]')
    );
  }

  private extractCategory(): string | null {
    const breadcrumbs = document.querySelectorAll(
      '[data-test-id="breadcrumb"] span, .breadcrumb span, [class*="breadcrumb"] span',
    );
    if (breadcrumbs.length > 0) {
      return breadcrumbs[breadcrumbs.length - 1].textContent?.trim() ?? null;
    }
    return null;
  }

  private extractImageUrl(): string | null {
    return (
      this.safeQueryAttr('img[data-test-id="product-image"]', "src") ??
      this.safeQueryAttr(".product-image img", "src") ??
      this.safeQueryAttr('[class*="productImage"] img', "src") ??
      this.getMetaContent('meta[property="og:image"]')
    );
  }

  private extractSpecs(): Record<string, string> {
    const specs: Record<string, string> = {};
    const rows = document.querySelectorAll(
      ".specs-table tr, [class*='specRow'], [data-test-id='attributes'] li",
    );
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td, span");
      if (cells.length >= 2) {
        const key = cells[0].textContent?.trim();
        const value = cells[1].textContent?.trim();
        if (key && value) specs[key] = value;
      }
    });
    return specs;
  }

  private extractReviews() {
    const reviewBlocks = document.querySelectorAll(
      '[data-test-id="review-item"], .comment-item, [class*="reviewItem"]',
    );
    return Array.from(reviewBlocks)
      .slice(0, 15)
      .map((item) => {
        const text =
          item
            .querySelector(
              '[data-test-id="review-comment-text"], .comment-text, [class*="reviewText"]',
            )
            ?.textContent?.trim() ?? "";
        const ratingEl = item.querySelector(
          '[data-test-id="review-rating"], [class*="rating"]',
        );
        const ratingText =
          ratingEl?.getAttribute("data-score") ?? ratingEl?.textContent ?? "";
        const rating = parseFloat(ratingText);
        return {
          rating: isNaN(rating) ? null : Math.round(rating),
          text,
          date:
            item.querySelector('[class*="date"], .comment-date')?.textContent?.trim() ??
            null,
          verified_buyer: !!item.querySelector(
            '[class*="verified"], [data-test-id*="verified"]',
          ),
        };
      })
      .filter((r) => r.text.length > 0);
  }
}
