import { BaseScraper } from "./base";
import type { ScrapedProduct } from "../../shared/types";

interface N11JsonLdProduct {
  name?: string;
  description?: string;
  brand?: string | { name?: string };
  aggregateRating?: {
    ratingValue?: string | number;
    reviewCount?: string | number;
    ratingCount?: string | number;
  };
}

interface N11JsonLdOffer {
  price?: string | number;
  priceCurrency?: string;
}

export class N11Scraper extends BaseScraper {
  canHandle(url: string): boolean {
    return /n11\.com/i.test(url) && /\/urun\//i.test(url);
  }

  override getAddToCartSelectors(): string[] {
    return [
      ".addBasketUnify",
      ".btnAddBasket",
      "#addToCart",
      'button[id*="addToCart"]',
      'button[class*="addToCart"]',
      'button[class*="addBasket"]',
      'button[data-testid*="add-to-cart"]',
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
        source: "n11",
      };
    } catch {
      return null;
    }
  }

  private extractProductId(): string {
    const pathMatch = window.location.pathname.match(/\/urun\/([^/?#]+)/i);
    const queryId = new URLSearchParams(window.location.search).get("magazaUrunId");
    return queryId ?? pathMatch?.[1] ?? `n11_${Date.now()}`;
  }

  private extractProductName(product: N11JsonLdProduct | null): string | null {
    return (
      product?.name?.trim() ??
      this.safeQueryText("h1.proName") ??
      this.safeQueryText("h1.productName") ??
      this.safeQueryText('[class*="productName"]') ??
      this.safeQueryText('[data-testid*="product-title"]') ??
      this.safeQueryText("h1") ??
      this.getMetaContent(
        'meta[property="og:title"]',
        'meta[name="title"]',
        'meta[name="twitter:title"]',
      )
    );
  }

  private extractPrice(offer: N11JsonLdOffer | null): number | null {
    if (offer?.price !== undefined) {
      const parsed = this.parsePrice(String(offer.price));
      if (parsed !== null) return parsed;
    }

    const priceText =
      this.safeQueryAttr('[itemprop="price"]', "content") ??
      this.safeQueryText(".newPrice ins") ??
      this.safeQueryText(".priceContainer .price") ??
      this.safeQueryText(".unf-p-summary-price") ??
      this.safeQueryText('[class*="price"] ins') ??
      this.safeQueryText('[class*="Price"]') ??
      this.getMetaContent(
        'meta[property="product:price:amount"]',
        'meta[property="og:price:amount"]',
      );

    return priceText ? this.parsePrice(priceText) : null;
  }

  private extractCurrency(): string {
    return (
      this.getMetaContent(
        'meta[property="product:price:currency"]',
        'meta[property="og:price:currency"]',
      ) ?? "TRY"
    );
  }

  private extractRating(product: N11JsonLdProduct | null): number | null {
    const jsonLdRating = product?.aggregateRating?.ratingValue;
    if (jsonLdRating !== undefined) {
      const parsed = parseFloat(String(jsonLdRating).replace(",", "."));
      if (!Number.isNaN(parsed)) return parsed;
    }

    const ratingText =
      this.safeQueryAttr('[itemprop="ratingValue"]', "content") ??
      this.safeQueryText(".ratingCont .rating") ??
      this.safeQueryText('[class*="rating"] [class*="score"]') ??
      this.safeQueryText('[class*="ratingScore"]') ??
      this.safeQueryText('[class*="review"] [class*="score"]');

    if (!ratingText) return null;
    const match = ratingText.replace(",", ".").match(/\d+(?:\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }

  private extractReviewCount(product: N11JsonLdProduct | null): number | null {
    const jsonLdCount =
      product?.aggregateRating?.reviewCount ?? product?.aggregateRating?.ratingCount;
    if (jsonLdCount !== undefined) {
      const parsed = parseInt(String(jsonLdCount).replace(/[^\d]/g, ""), 10);
      if (!Number.isNaN(parsed)) return parsed;
    }

    const countText =
      this.safeQueryAttr('[itemprop="reviewCount"]', "content") ??
      this.safeQueryText(".ratingCont .reviewNum") ??
      this.safeQueryText('[class*="reviewCount"]') ??
      this.safeQueryText('[class*="commentCount"]') ??
      this.safeQueryText('a[href*="yorum"]');

    if (!countText) return null;
    const match = countText.replace(/[.,]/g, "").match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  private extractSeller(): string | null {
    return (
      this.safeQueryText(".sellerName") ??
      this.safeQueryText(".unf-p-seller-name") ??
      this.safeQueryText('[class*="sellerName"]') ??
      this.safeQueryText('[data-testid*="seller"]')
    );
  }

  private extractCategory(): string | null {
    const breadcrumbs = document.querySelectorAll(
      ".breadCrumb a, .breadcrumb a, [class*='breadcrumb'] a, [class*='breadCrumb'] a",
    );
    if (breadcrumbs.length > 0) {
      return breadcrumbs[breadcrumbs.length - 1].textContent?.trim() ?? null;
    }
    return null;
  }

  private extractImageUrl(product: N11JsonLdProduct | null): string | null {
    return (
      this.readJsonLdImage(product) ??
      this.safeQueryAttr("#imgObj", "src") ??
      this.safeQueryAttr(".imgObj img", "src") ??
      this.safeQueryAttr(".unf-p-img img", "src") ??
      this.safeQueryAttr('[class*="productImage"] img', "src") ??
      this.getMetaContent(
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
      )
    );
  }

  private extractSpecs(product: N11JsonLdProduct | null): Record<string, string> {
    const specs: Record<string, string> = {};
    if (product?.description) specs.description = product.description;

    document
      .querySelectorAll(
        ".unf-prop-list li, .unf-prop li, .attributeList li, [class*='attribute'] li",
      )
      .forEach((item, index) => {
        const key =
          item.querySelector("strong, b, [class*='name'], [class*='key']")
            ?.textContent?.trim() ?? `feature_${index + 1}`;
        const value =
          item.querySelector("span, [class*='value']")
            ?.textContent?.trim() ??
          item.textContent?.replace(/\s+/g, " ").trim();
        if (key && value && key !== value) specs[key] = value;
      });

    return specs;
  }

  private extractReviews() {
    const reviewBlocks = document.querySelectorAll(
      ".comment, .commentItem, [class*='reviewItem'], [data-testid*='review']",
    );

    return Array.from(reviewBlocks)
      .slice(0, 15)
      .map((item) => {
        const ratingText =
          item.querySelector("[data-rating]")?.getAttribute("data-rating") ??
          item.querySelector("[class*='rating'], [class*='star']")?.textContent ??
          "";
        const ratingMatch = ratingText.replace(",", ".").match(/\d+(?:\.\d+)?/);

        return {
          author:
            item.querySelector(".userName, [class*='userName'], [class*='author']")
              ?.textContent?.trim() ?? null,
          rating: ratingMatch ? Math.round(parseFloat(ratingMatch[0])) : null,
          text:
            item.querySelector(".commentText, [class*='commentText'], p")
              ?.textContent?.replace(/\s+/g, " ").trim() ?? "",
          date:
            item.querySelector(".commentDate, [class*='date']")
              ?.textContent?.trim() ?? null,
          verified_buyer:
            item.textContent?.toLocaleLowerCase("tr-TR").includes("satın aldı") ??
            false,
        };
      })
      .filter((review) => review.text.length > 0);
  }
}
