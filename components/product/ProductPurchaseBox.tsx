"use client";
import React, { useState, useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { ProductDetails, ProductVariant } from "@/lib/queries";

interface ProductPurchaseBoxProps {
  product: ProductDetails;
  selectedVariant: ProductVariant | null;
}

export default function ProductPurchaseBox({ product, selectedVariant }: ProductPurchaseBoxProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const { addToCart } = useCart();
  const [showToast, setShowToast] = useState(false);

  // The available stock for the currently selected variant
  const stock = selectedVariant?.stock ?? 0;

  // When the variant changes, reset the quantity to 1
  useEffect(() => {
    setQuantity(1);
  }, [selectedVariant]);

  const handleAddToCart = () => {
    if (!selectedVariant || quantity === 0) return;

    // Find the full color object to get its name and showcase image
    const color = product.colors.find(c => c.variants.some(v => v.id === selectedVariant.id));
    
    // Find the showcase image for the selected color (position 1, or the first image as a fallback)
    const showcaseImage = color?.images?.find(img => img.position === 1) || color?.images?.[0];

    addToCart({
      variantId: selectedVariant.id, // This is the unique variant ID
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: showcaseImage?.url || '/placeholder.png', // Use the showcase image URL
      size: selectedVariant.size,
      color: color?.name || "N/A",
      quantity,
      stock: selectedVariant.stock,
    });

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Determine if the "Add to Cart" button should be disabled
  const canAddToCart = selectedVariant && stock > 0 && quantity > 0;

  return (
    <div className="w-full">
      {/* --- This component no longer displays or selects color/size --- */}
      {/* --- That is handled by the parent ProductDisplay component --- */}

      {/* Quantity Selector */}
      <div className="mb-2 text-sm font-medium">Quantity</div>
      <div className="flex items-center mb-6">
        <button
          onClick={() => setQuantity(q => Math.max(1, q - 1))}
          disabled={quantity <= 1 || !selectedVariant}
          className="border rounded-l px-3 py-2 text-xl disabled:opacity-50"
        > – </button>
        <span className="border-t border-b px-4 py-2 text-lg">{selectedVariant ? quantity : "-"}</span>
        <button
          onClick={() => setQuantity(q => Math.min(stock, q + 1))}
          disabled={!selectedVariant || quantity >= stock}
          className="border rounded-r px-3 py-2 text-xl disabled:opacity-50"
        > + </button>
        {selectedVariant && <span className="ml-4 text-sm text-gray-600">{stock} available</span>}
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={!canAddToCart}
        className="bg-black text-white px-4 py-2 rounded-xl w-full disabled:opacity-60"
      >
        {!selectedVariant ? "Select a Size" : stock === 0 ? "Out of Stock" : "Add to Cart"}
      </button>

      {/* "Added to Cart" Toast Notification */}
      {showToast && (
        <div className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50">
          <div className="max-w-sm w-full bg-green-600 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
            <div className="p-4">
              <div className="flex items-start">
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-white">Added to cart!</p>
                  <div className="mt-2">
                    <a href="/cart" className="text-sm font-medium text-white underline hover:text-green-100">View Cart</a>
                    <button onClick={() => setShowToast(false)} className="ml-4 text-sm font-medium text-white underline hover:text-green-100">Dismiss</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
