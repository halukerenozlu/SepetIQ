import { AmazonScraper } from "./amazon";
import { DemoScraper } from "./demo";
import { GenericScraper } from "./generic";
import { HepsiburadaScraper } from "./hepsiburada";
import { N11Scraper } from "./n11";
import { TrendyolScraper } from "./trendyol";

export const SCRAPERS = [
  new DemoScraper(),
  new TrendyolScraper(),
  new HepsiburadaScraper(),
  new AmazonScraper(),
  new N11Scraper(),
  new GenericScraper(),
];
