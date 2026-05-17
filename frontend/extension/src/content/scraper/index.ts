import { DemoScraper } from "./demo";
import { GenericScraper } from "./generic";
import { TrendyolScraper } from "./trendyol";

export const SCRAPERS = [
  new DemoScraper(),
  new TrendyolScraper(),
  new GenericScraper(),
];
