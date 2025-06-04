import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/queries"; // Assuming Product type is exported from queries

interface ShopContentProps {
  products: Product[];
}

export default function ShopContent({ products }: ShopContentProps) {
  return (
    <main className="px-6 py-10 bg-gray-50 text-gray-900">
      <section className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            // product.imageUrl is already a signed URL (or empty string)
            // DEBUG: Log image URL to server console
            if (product.imageUrl) {
              console.log("SHOP CONTENT IMAGE URL:", product.imageUrl);
            }
            return (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition block"
              >
                {product.imageUrl && (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    width={400}
                    height={400}
                    className="w-full h-96 object-cover"
                  />
                )}
                <div className="p-4 text-center">
                  <h3 className="text-lg font-normal mb-2">{product.name}</h3>
                  <p className="text-gray-600">₱{product.price}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
} 