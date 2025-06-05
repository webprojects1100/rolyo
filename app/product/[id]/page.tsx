import { fetchProductById } from '@/lib/queries';
// import Image from 'next/image'; // No longer directly used here
import { notFound } from 'next/navigation';
// import ProductPurchaseBox from '@/components/product/ProductPurchaseBox'; // No longer directly used here
import ProductDisplay from '@/components/product/ProductDisplay'; // Import the new client component

export default async function ProductPage({
  params: paramsPromise, 
  searchParams: searchParamsPromise, // Renamed and will be awaited
}: {
  params: Promise<{ id: string }>; 
  searchParams?: Promise<{ [key: string]: string | string[] | undefined; }>; // Typed as Promise or undefined
}) {
  const params = await paramsPromise; 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const searchParams = await searchParamsPromise; // Await searchParams

  // console.log(searchParams); // You can uncomment this to see if it has a value at runtime if needed

  const product = await fetchProductById(params.id);
  if (!product) return notFound();

  // All display logic is now handled by ProductDisplay
  // The product object might need its 'images' and 'sizes' to be non-null arrays for ProductDisplay
  // Let's ensure they are at least empty arrays if null/undefined from fetchProductById for type safety with ProductDisplay
  const productForDisplay = {
    ...product,
    images: product.images || [],
    sizes: product.sizes || [],
    // description can be null, ProductDisplay handles it
  };

  return <ProductDisplay product={productForDisplay} />;
}
