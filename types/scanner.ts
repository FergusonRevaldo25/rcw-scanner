export interface Product {
  slug: string;
  name: string;
  barcode: string;
}

export interface ScanLogEntry {
  raw: string;
  time: string;
  matched?: Product;
}
