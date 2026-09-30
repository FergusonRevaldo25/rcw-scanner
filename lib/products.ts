import { Product } from "@/types/scanner";

export const products: Product[] = [
  {
    slug: "rcw-hoodie-black",
    name: "RCW Black Hoodie",
    barcode: "6001234567890",
  },
  {
    slug: "rcw-tshirt-white",
    name: "RCW White T-Shirt",
    barcode: "6001234567891",
  },
  {
    slug: "invoice-template-pack",
    name: "Invoice Template Pack",
    barcode: "6001234567892",
  },
  {
    slug: "social-media-kit",
    name: "Social Media Starter Kit",
    barcode: "6001234567893",
  },
];

export function getProductByBarcode(barcode: string): Product | undefined {
  return products.find((p) => p.barcode === barcode);
}
