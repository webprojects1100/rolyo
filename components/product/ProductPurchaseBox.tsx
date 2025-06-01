"use client";
import React, { useState, useEffect } from "react";
import { useCart } from "@/hooks/useCart";

interface ProductPurchaseBoxProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  sizes: { size: string; stock: number }[];
}

const SIZE_LABELS: Record<string, string> = {
  "XS": "EXTRA-SMALL",
  "S": "SMALL",
  "M": "MEDIUM",
  "L": "LARGE",
  "XL": "EXTRA - LARGE",
  "XXL": "2X-LARGE",
  "XXXL": "3X-LARGE",
  "XXXXL": "4X-LARGE",
};

export default function ProductPurchaseBox({ id, name, price, imageUrl, sizes }: ProductPurchaseBoxProps) {
  const [selectedSize, setSelectedSize] = useState<string>(sizes[0]?.size || "");
  const [quantity, setQuantity] = useState<number>(1);
  const { addToCart } = useCart();
  const [showToast, setShowToast] = useState(false);

  // Find the stock for the selected size
  const selectedStock = sizes.find(s => s.size === selectedSize)?.stock ?? 0;

  // Effect to reset quantity when selectedSize changes
  useEffect(() => {
    const newSelectedSizeData = sizes.find(s => s.size === selectedSize);
    const newSelectedStock = newSelectedSizeData?.stock ?? 0;
    // Reset quantity to 1 if the new size has stock, or if the current quantity exceeds new stock
    // Always ensure quantity is at least 1 if there is any stock for the selected size.
    if (newSelectedStock > 0) {
        setQuantity(prevQuantity => Math.min(Math.max(1, prevQuantity), newSelectedStock));
        // If current quantity is higher than new stock, clamp it. Otherwise, keep it if it's valid, or set to 1.
        // A simpler approach: always reset to 1 when size changes and stock > 0
        // setQuantity(1);
    } else {
        // If new size is out of stock, quantity might still be 1 (and buttons will be disabled)
        setQuantity(1); 
    }
  }, [selectedSize, sizes]);

  const handleAddToCart = () => {
    addToCart({
      id,
      name,
      price,
      imageUrl,
      size: selectedSize,
      quantity,
      stock: selectedStock,
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="w-full">
      <div className="mb-2 text-sm font-medium">Size: {SIZE_LABELS[selectedSize] || selectedSize}</div>
      <div className="flex flex-wrap gap-2 mb-6">
        {sizes.map(({ size, stock }) => (
          <button
            key={size + '-' + stock}
            type="button"
            className={`border rounded px-4 py-2 font-medium ${selectedSize === size ? "bg-black text-white" : "bg-white text-black"} ${stock === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => stock > 0 && setSelectedSize(size)}
            disabled={stock === 0}
            aria-disabled={stock === 0}
          >
            {SIZE_LABELS[size] || size}
            {stock === 0 && <span className="ml-2 text-xs text-red-500">(Out of stock)</span>}
          </button>
        ))}
      </div>
      {/* UX: If all sizes are out of stock, show a message and disable Add to Cart */}
      {sizes.every(s => s.stock === 0) && (
        <div className="mb-4 text-center text-red-600 font-semibold">All sizes are out of stock.</div>
      )}
      <div className="mb-2 text-sm font-medium">Quantity</div>
      <div className="flex items-center mb-6">
        <button
          type="button"
          className="border rounded-l px-3 py-2 text-xl"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1 || selectedStock === 0}
        >
          –
        </button>
        <span className="border-t border-b px-4 py-2 text-lg">{quantity}</span>
        <button
          type="button"
          className="border rounded-r px-3 py-2 text-xl"
          onClick={() => setQuantity((q) => Math.min(selectedStock, q + 1))}
          disabled={quantity >= selectedStock || selectedStock === 0}
        >
          +
        </button>
      </div>
      <button
        className="bg-black text-white px-4 py-2 rounded-xl w-full"
        onClick={handleAddToCart}
        disabled={selectedStock === 0 || sizes.every(s => s.stock === 0)}
      >
        {selectedStock === 0 || sizes.every(s => s.stock === 0) ? 'Out of Stock' : 'Add to Cart'}
      </button>
      {showToast && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-green-600 text-white px-6 py-3 rounded shadow-lg flex items-center gap-4 pointer-events-auto">
            Added to cart!
            <a href="/cart" className="underline ml-2">View Cart</a>
          </div>
        </div>
      )}
    </div>
  );
}
