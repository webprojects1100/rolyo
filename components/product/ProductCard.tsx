import Image from "next/image";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`}> {/* Route will be created */}
      <div className="rounded-2xl border shadow-md hover:shadow-xl transition overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={400}
          height={400}
          className="w-full h-72 object-cover"
        />
        <div className="p-4">
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <p className="text-neutral-500">₱{product.price}</p>
        </div>
      </div>
    </Link>
  );
}
