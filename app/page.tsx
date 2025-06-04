import { fetchProducts } from "@/lib/queries";
import ShopContent from "@/components/shop/ShopContent";

export const dynamic = "force-dynamic"; // To ensure fresh data

export default async function HomePage() {
  const products = await fetchProducts();

  // The ShopContent component includes its own <main> tag, so we can render it directly.
  // If you want other homepage-specific content outside the shop layout,
  // you might re-introduce a <main> or other layout elements here and place <ShopContent> within it.
  return <ShopContent products={products} />;
}
