import { fetchProducts } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

export default async function ProductGrid() {
  const products = await fetchProducts();

  // Generate signed URLs for product images
  const productsWithSignedUrls = await Promise.all(
    products.map(async (product) => {
      if (
        product.imageUrl &&
        !product.imageUrl.startsWith("/") &&
        !product.imageUrl.startsWith("http")
      ) {
        const { data } = await supabase.storage
          .from("product-images")
          .createSignedUrl(product.imageUrl, 60 * 60); // 1 hour
        return {
          ...product,
          imageUrl: data?.signedUrl || "",
        };
      }
      return product;
    })
  );

  return (
    <section className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {productsWithSignedUrls.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition block"
          >
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={400}
              height={400}
              className="w-full h-96 object-cover"
            />
            <div className="p-4 text-center">
              <h3 className="text-lg font-normal mb-2">{product.name}</h3>
              <p className="text-gray-600">₱{product.price}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
