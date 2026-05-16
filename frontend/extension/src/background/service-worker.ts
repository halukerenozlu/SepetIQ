/**
 * background/service-worker.ts - Manifest V3 service worker
 *
 * Keeps the background entry name distinct from the content script entry. The
 * CRX build can otherwise emit two "index.ts" chunks and wire the loader to the
 * wrong bundle.
 */

import "./index";
