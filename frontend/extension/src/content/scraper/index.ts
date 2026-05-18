import { AmazonScraper } from "./amazon";
import { DemoScraper } from "./demo";
import { GenericScraper } from "./generic";
import { HepsiburadaScraper } from "./hepsiburada";
import { TrendyolScraper } from "./trendyol";

export const SCRAPERS = [
  new DemoScraper(),
  new TrendyolScraper(),
  new HepsiburadaScraper(),
  new AmazonScraper(),
  new GenericScraper(),
];
