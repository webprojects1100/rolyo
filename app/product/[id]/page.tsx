import { fetchProductById } from '@/lib/queries';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ProductPurchaseBox from '@/components/product/ProductPurchaseBox';

export default async function ProductPage({
  params: paramsPromise, // Renamed to indicate it's a promise
  // searchParams, // Intentionally commented out as it's not used, can be re-added if needed
}: {
  params: Promise<{ id: string }>; // Explicitly type as a Promise
  searchParams?: { [key: string]: string | string[] | undefined }; // Kept for potential future use
}) {
  const params = await paramsPromise; // Await the params
  const product = await fetchProductById(params.id);
  if (!product) return notFound();

  // The product.images array now contains full public URLs from fetchProductById
  // No need to generate signed URLs here anymore.
  const displayImages = product.images || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center md:items-center justify-center md:justify-end min-h-[70vh]">
      <div className="w-full md:w-1/2 flex flex-col items-center md:items-end">
        {/* Product Image Gallery */}
        <div className="w-full flex flex-col items-center md:items-end">
          {displayImages.length > 0 && displayImages[0] && (displayImages[0].startsWith('http') || displayImages[0].startsWith('/')) && (
            <Image
              src={displayImages[0]}
              alt={product.name}
              width={600}
              height={600}
              className="rounded-2xl object-cover mb-4"
            />
          )}
          {/* Thumbnails if more images exist */}
          {displayImages.length > 1 && (
            <div className="flex gap-2 mt-2 justify-center md:justify-end w-full">
              {displayImages.slice(1).map((img: string, idx: number) => (
                (img && (img.startsWith('http') || img.startsWith('/')) ? (
                  <Image
                    key={idx}
                    src={img}
                    alt={product.name + ' thumbnail'}
                    width={100}
                    height={100}
                    className="rounded object-cover border"
                  />
                ) : null)
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="w-full md:w-1/2 flex flex-col items-center md:items-end mt-8 md:mt-0 md:ml-8">
        <h1 className="text-3xl font-bold mb-2 text-left w-full">{product.name}</h1>
        <p className="text-gray-600 mb-4 text-left w-full">{product.description}</p>
        <p className="text-xl font-semibold mb-4 text-left w-full">₱{product.price}</p>
        {product.sizes && product.sizes.length > 0 && (
          <div className="w-full">
            <ProductPurchaseBox
              id={product.id}
              name={product.name}
              price={product.price}
              imageUrl={displayImages.length > 0 && (displayImages[0].startsWith('http') || displayImages[0].startsWith('/')) ? displayImages[0] : ''}
              sizes={product.sizes}
            />
          </div>
        )}
      </div>
    </div>
  );
}
