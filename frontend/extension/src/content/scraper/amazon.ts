import { BaseScraper } from "./base";
import type { ScrapedProduct } from "../../shared/types";

interface AmazonJsonLdProduct {
  name?: string;
  description?: string;
  aggregateRating?: {
    ratingValue?: string | number;
    reviewCount?: string | number;
    ratingCount?: string | number;
  };
}

interface AmazonJsonLdOffer {
  price?: string | number;
  priceCurrency?: string;
}

export class AmazonScraper extends BaseScraper {
  canHandle(url: string): boolean {
    return /amazon\.com\.tr/i.test(url);
  }

  override getAddToCartSelectors(): string[] {
    return [
      "#add-to-cart-button",
      "#buy-now-button",
      'input[name="submit.add-to-cart"]',
      'input[name="submit.buy-now"]',
      "[data-action='add-to-cart']",
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
        currency: offer?.priceCurrency ?? this.extractCurrency(),
        rating: this.extractRating(product),
        reviewCount,
        review_count: reviewCount,
        seller: this.extractSeller(),
        category: this.extractCategory(),
        imageUrl,
        image_url: imageUrl,
        specs: this.extractSpecs(product),
        reviews: this.extractReviews(),
        scrapedAt: new Date().toISOString(),
        source: "amazon",
      };
    } catch {
      return null;
    }
  }

  private extractProductId(): string {
    const match = window.location.pathname.match(
      /\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?#]|$)/i,
    );
    return match?.[1] ?? `amazon_${Date.now()}`;
  }

  private extractProductName(product: AmazonJsonLdProduct | null): string | null {
    return (
      product?.name?.trim() ??
      this.safeQueryText("#productTitle") ??
      this.getMetaContent(
        'meta[property="og:title"]',
        'meta[name="title"]',
        'meta[name="twitter:title"]',
      )
    );
  }

  private extractPrice(offer: AmazonJsonLdOffer | null): number | null {
    if (offer?.price !== undefined) {
      return this.parsePrice(String(offer.price));
    }

    const priceText =
      this.safeQueryText(".a-price .a-offscreen") ??
      this.safeQueryText("#priceblock_ourprice") ??
      this.safeQueryText("#priceblock_dealprice") ??
      this.safeQueryText("#corePriceDisplay_desktop_feature_div .a-price") ??
      this.getMetaContent('meta[property="product:price:amount"]');

    return priceText ? this.parsePrice(priceText) : null;
  }

  private extractCurrency(): string {
    return (
      this.getMetaContent('meta[property="product:price:currency"]') ??
      "TRY"
    );
  }

  private extractRating(product: AmazonJsonLdProduct | null): number | null {
    const jsonLdRating = product?.aggregateRating?.ratingValue;
    if (jsonLdRating !== undefined) {
      const parsed = parseFloat(String(jsonLdRating).replace(",", "."));
      if (!Number.isNaN(parsed)) return parsed;
    }

    const ratingText =
      this.safeQueryText("#acrPopover .a-icon-alt") ??
      this.safeQueryText("[data-hook='rating-out-of-text']") ??
      this.safeQueryText(".reviewCountTextLinkedHistogram .a-icon-alt");

    if (!ratingText) return null;
    const match = ratingText.replace(",", ".").match(/\d+(?:\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }

  private extractReviewCount(product: AmazonJsonLdProduct | null): number | null {
    const jsonLdCount =
      product?.aggregateRating?.reviewCount ?? product?.aggregateRating?.ratingCount;
    if (jsonLdCount !== undefined) {
      const parsed = parseInt(String(jsonLdCount), 10);
      if (!Number.isNaN(parsed)) return parsed;
    }

    const countText =
      this.safeQueryText("#acrCustomerReviewText") ??
      this.safeQueryText("[data-hook='total-review-count']");
    if (!countText) return null;

    const match = countText.replace(/[.,]/g, "").match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  private extractSeller(): string | null {
    return (
      this.safeQueryText("#sellerProfileTriggerId") ??
      this.safeQueryText("#merchant-info") ??
      this.safeQueryText("#bylineInfo")
    );
  }

  private extractCategory(): string | null {
    const breadcrumbs = document.querySelectorAll("#wayfinding-breadcrumbs_feature_div li a");
    if (breadcrumbs.length > 0) {
      return breadcrumbs[breadcrumbs.length - 1].textContent?.trim() ?? null;
    }
    return null;
  }

  private extractImageUrl(product: AmazonJsonLdProduct | null): string | null {
    return (
      this.readJsonLdImage(product) ??
      this.safeQueryAttr("#landingImage", "src") ??
      this.getMetaContent('meta[property="og:image"]')
    );
  }

  private extractSpecs(product: AmazonJsonLdProduct | null): Record<string, string> {
    const specs: Record<string, string> = {};
    if (product?.description) specs.description = product.description;

    document
      .querySelectorAll("#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr")
      .forEach((row) => {
        const key = row.querySelector("th")?.textContent?.trim();
        const value = row.querySelector("td")?.textContent?.trim();
        if (key && value) specs[key.replace(/\s+/g, " ")] = value.replace(/\s+/g, " ");
      });

    document.querySelectorAll("#detailBullets_feature_div li").forEach((item, index) => {
      const text = item.textContent?.replace(/\s+/g, " ").trim();
      if (text) specs[`detail_${index + 1}`] = text;
    });

    return specs;
  }

  private extractReviews() {
    const reviewBlocks = document.querySelectorAll("[data-hook='review']");

    return Array.from(reviewBlocks)
      .slice(0, 15)
      .map((item) => {
        const ratingText = item.querySelector(".a-icon-alt")?.textContent ?? "";
        const ratingMatch = ratingText.replace(",", ".").match(/\d+(?:\.\d+)?/);
        return {
          author: item.querySelector(".a-profile-name")?.textContent?.trim() ?? null,
          rating: ratingMatch ? Math.round(parseFloat(ratingMatch[0])) : null,
          text:
            item.querySelector("[data-hook='review-body']")?.textContent?.replace(/\s+/g, " ").trim() ??
            "",
          date: item.querySelector("[data-hook='review-date']")?.textContent?.trim() ?? null,
          verified_buyer: Boolean(item.querySelector("[data-hook='avp-badge']")),
        };
      })
      .filter((review) => review.text.length > 0);
  }
}
