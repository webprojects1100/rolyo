"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import ProductPurchaseBox from "@/components/product/ProductPurchaseBox";
import { ProductDetails, ProductVariant } from "@/lib/queries";

interface ProductDisplayProps {
  product: ProductDetails;
}

export default function ProductDisplay({ product }: ProductDisplayProps) {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    if (product && product.colors && product.colors.length > 0) {
      setSelectedColorId(product.colors[0].id);
      setSelectedSize(null);
    } else {
      setSelectedColorId(null);
      setSelectedSize(null);
    }
  }, [product]);

  const { selectedColor, availableSizes, selectedVariant } = useMemo(() => {
    if (!selectedColorId || !product.colors) {
      return { selectedColor: null, availableSizes: [], selectedVariant: null };
    }
    const color = product.colors.find(c => c.id === selectedColorId) || null;
    const sizes = color ? color.variants.map(v => ({ size: v.size, stock: v.stock })) : [];
    let variant: ProductVariant | null = null;
    if (color && selectedSize) {
      variant = color.variants.find(v => v.size === selectedSize) || null;
    }
    return { selectedColor: color, availableSizes: sizes, selectedVariant: variant };
  }, [selectedColorId, selectedSize, product.colors]);

  const mainImageUrl = selectedColor?.showcase_image_url || product.images?.[0]?.url || "";

  if (!product) {
    return <div>Product data is not available.</div>;
  }

  const handleColorSelect = (colorId: string) => {
    setSelectedColorId(colorId);
    setSelectedSize(null);
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
  };
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col md:flex-row items-start justify-center min-h-[70vh]">
      <div className="w-full md:w-1/2 flex flex-col items-center mb-8 md:mb-0 md:sticky md:top-24">
        <div className="w-full aspect-square bg-white rounded-2xl flex items-center justify-center overflow-hidden">
          {mainImageUrl ? (
            <Image
              src={mainImageUrl}
              alt={product.name}
              width={600}
              height={600}
              className="object-cover w-full h-full"
              priority
              key={mainImageUrl}
            />
          ) : (
            <div className="text-gray-500">No image available</div>
          )}
        </div>
      </div>

      <div className="w-full md:w-1/2 md:pl-8 lg:pl-12">
        <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
        <p className="text-gray-700 mb-4 whitespace-pre-line">{product.description || "No description available."}</p>
        <p className="text-2xl font-semibold mb-6">₱{product.price.toFixed(2)}</p>

        {product.colors.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Color: <span className="font-normal">{selectedColor?.name || 'Select a color'}</span></h3>
            <div className="flex gap-2">
              {product.colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleColorSelect(color.id)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColorId === color.id ? 'ring-2 ring-offset-2 ring-black' : 'border-gray-300'}`}
                  style={{ backgroundColor: color.hex }}
                  aria-label={`Select color ${color.name}`}
                ></button>
              ))}
            </div>
          </div>
        )}

        {selectedColor && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Size: <span className="font-normal">{selectedSize || 'Select a size'}</span></h3>
            <div className="flex gap-2 flex-wrap">
              {availableSizes.map(({ size, stock }) => {
                const isSelected = selectedSize === size;
                const isOutOfStock = stock === 0;
                return (
                  <button
                    key={size}
                    onClick={() => !isOutOfStock && handleSizeSelect(size)}
                    disabled={isOutOfStock}
                    className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors
                      ${isSelected ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300'}
                      ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}
                    `}
                  >
                    {isOutOfStock ? <s>{size}</s> : size}
                  </button>
                );
              })}
            </div>
            {availableSizes.length > 0 && availableSizes.every(s => s.stock === 0) && (
               <p className="text-sm text-red-500 mt-2">All sizes for this color are out of stock.</p>
            )}
          </div>
        )}
        
        <ProductPurchaseBox
          product={product}
          selectedVariant={selectedVariant}
        />
      </div>
    </div>
  );
} 
