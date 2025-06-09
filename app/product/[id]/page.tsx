import { fetchProductById } from '@/lib/queries';
// import Image from 'next/image'; // No longer directly used here
import { notFound } from 'next/navigation';
// import ProductPurchaseBox from '@/components/product/ProductPurchaseBox'; // No longer directly used here
import ProductDisplay from '@/components/product/ProductDisplay'; // Import the new client component

export default async function ProductPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>; 
}) {
  const params = await paramsPromise;
  const product = await fetchProductById(params.id);

  if (!product) {
    return notFound();
  }

  // The new `ProductDisplay` component is designed to handle the `product` object directly.
  // We no longer need to create an intermediate `productForDisplay` object.
  return <ProductDisplay product={product} />;
}
