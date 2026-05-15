/**
 * content/scraper/base.ts — Abstract base scraper
 *
 * Provides shared DOM utility methods.
 * Each site-specific scraper extends this class.
 */

import type { ScrapedProduct } from "../../shared/types";

export type { ScrapedProduct };

export abstract class BaseScraper {
  /** Returns true if this scraper can handle the given URL. */
  abstract canHandle(url: string): boolean;

  /**
   * Scrapes the current page and returns product data.
   * Returns null if the page is not a recognized product page.
   */
  abstract scrape(): ScrapedProduct | null;

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
    }
    // If only dots, treat as-is (may be thousands separator, hard to tell)

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
}
