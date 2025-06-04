import { fetchProducts } from "@/lib/queries";
import ShopContent from "@/components/shop/ShopContent";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const products = await fetchProducts();

  return <ShopContent products={products} />;
}
