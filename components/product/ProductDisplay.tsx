"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import ProductPurchaseBox from "@/components/product/ProductPurchaseBox";

// Define a more accurate product type based on known structure
interface ProductDetail {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  images?: string[] | null;       // Array of image URLs
  sizes?: { size: string; stock: number; id?: string }[] | null; // id for sizes is optional, as seen in Admin page
  colors?: { name: string; hex: string; id?: string }[] | null;
  // Add any other relevant product fields that ProductPurchaseBox or this component might need
}

interface ProductDisplayProps {
  product: ProductDetail;
}

export default function ProductDisplay({ product }: ProductDisplayProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string; id?: string } | null>(null);

  useEffect(() => {
    if (product && product.images && product.images.length > 0) {
      setSelectedImageUrl(product.images[0]); // First image is the default
    } else {
      setSelectedImageUrl(""); // Fallback for no images
    }
    if (product && product.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
    }
  }, [product]);

  if (!product) {
    return <div>Product data is not available.</div>;
  }
  
  const handleThumbnailClick = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
  };

  const displayImages = product.images || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col md:flex-row items-start md:items-start justify-center min-h-[70vh]">
      {/* Image Gallery Section */}
      <div className="w-full md:w-1/2 flex flex-col items-center mb-8 md:mb-0 md:sticky md:top-24">
        {/* Main Image */}
        <div className="w-full aspect-square bg-white rounded-2xl flex items-center justify-center overflow-hidden mb-4">
          {selectedImageUrl ? (
            <Image
              src={selectedImageUrl}
              alt={product.name}
              width={600}
              height={600}
              className="object-cover w-full h-full"
              priority
            />
          ) : (
            <div className="text-gray-500">No image available</div>
          )}
        </div>

        {/* Thumbnails */}
        {displayImages.length > 1 && (
          <div className="flex gap-2 justify-center w-full flex-wrap">
            {displayImages.map((imageUrl, idx) => {
              if (!imageUrl) return null; 

              return (
                <button
                  key={imageUrl + idx} // Use URL and index for key
                  onClick={() => handleThumbnailClick(imageUrl)}
                  className={`w-20 h-20 rounded-md overflow-hidden border-2 transition-all
                              ${selectedImageUrl === imageUrl ? "border-black ring-2 ring-black" : "border-gray-300 hover:border-gray-500"}
                              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black`}
                  aria-label={`View image ${idx + 1}`}
                >
                  <Image
                    src={imageUrl}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Info and Purchase Section */}
      <div className="w-full md:w-1/2 md:pl-8 lg:pl-12">
        <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
        <p className="text-gray-700 mb-4 whitespace-pre-line">{product.description || "No description available."}</p>
        <p className="text-2xl font-semibold mb-6">₱{product.price.toFixed(2)}</p>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Color</h3>
          <div className="flex gap-2">
            {(product.colors || []).map((color) => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor?.id === color.id ? 'ring-2 ring-offset-2 ring-black' : 'border-gray-300'}`}
                style={{ backgroundColor: color.hex }}
                aria-label={`Select color ${color.name}`}
              ></button>
            ))}
          </div>
        </div>
        
        {product.id && (
           <ProductPurchaseBox
             id={product.id}
             name={product.name}
             price={product.price}
             imageUrl={selectedImageUrl || (displayImages.length > 0 ? displayImages[0] : '')}
             sizes={product.sizes || []}
             selectedColor={selectedColor}
           />
        )}
      </div>
    </div>
  );
} 
