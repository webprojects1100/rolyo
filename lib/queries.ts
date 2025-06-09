import { supabase } from "./supabase";

// Type for related image row
type Image = {
  image_url: string;
  position: number;
};

// Type for the raw product + nested images from Supabase
type ProductRow = {
  id: string;
  name: string;
  price: number;
  images: Image[];
};

// Define the Product interface
export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

// Fetch current collection products
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      price,
      images (image_url, position)
    `)
    .eq("status", "collection")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching products:", error?.message);
    return [];
  }

  // Generate signed URLs for product images
  const productsWithSignedUrls = await Promise.all(
    data.map(async (product: ProductRow) => {
      const primaryImagePath = product.images.find((img) => img.position === 1)?.image_url || "";
      let imageUrl = "";

      if (primaryImagePath) {
        if (primaryImagePath.startsWith("http") || primaryImagePath.startsWith("/")) {
          imageUrl = primaryImagePath;
        } else {
          // Assume it's a path in Supabase storage. Since the bucket allows public access, construct the public URL.
          const { data: publicUrlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(primaryImagePath);
          
          if (publicUrlData && publicUrlData.publicUrl) {
            imageUrl = publicUrlData.publicUrl;
          } else if (primaryImagePath) { // If primaryImagePath existed but URL construction somehow failed (e.g. empty string)
             console.warn(`Could not construct public URL for ${primaryImagePath}. The path might be empty or invalid.`);
             imageUrl = ""; // Or a placeholder
          }
          // No try-catch needed here as getPublicUrl is synchronous and primarily string manipulation.
          // Errors would stem from primaryImagePath being invalid, which is handled by the conditional.
        }
      }

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl
      };
    })
  );
  return productsWithSignedUrls;
}

// Fetch archived products
export async function fetchArchivedProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      price,
      images (
        image_url,
        position
      )
    `)
    .eq("status", "archive")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching archived products:", error?.message);
    return [];
  }

  // Generate signed URLs for product images (archived)
  const productsWithSignedUrls = await Promise.all(
    data.map(async (product: ProductRow) => {
      const primaryImagePath = product.images.find((img) => img.position === 1)?.image_url || "";
      let imageUrl = "";

      if (primaryImagePath) {
        if (primaryImagePath.startsWith("http") || primaryImagePath.startsWith("/")) {
          imageUrl = primaryImagePath;
        } else {
          // Assume it's a path in Supabase storage. Since the bucket allows public access, construct the public URL.
          const { data: publicUrlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(primaryImagePath);

          if (publicUrlData && publicUrlData.publicUrl) {
            imageUrl = publicUrlData.publicUrl;
          } else if (primaryImagePath) { // If primaryImagePath existed but URL construction somehow failed (e.g. empty string)
             console.warn(`Could not construct public URL for ${primaryImagePath} (archived). The path might be empty or invalid.`);
             imageUrl = ""; // Or a placeholder
          }
          // No try-catch needed here as getPublicUrl is synchronous and primarily string manipulation.
          // Errors would stem from primaryImagePath being invalid, which is handled by the conditional.
        }
      }

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl
      };
    })
  );
  return productsWithSignedUrls;
}

// Define the detailed types for the new Product Variant structure
export interface ProductVariant {
  id: string;
  size: string;
  stock: number;
}

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  // The showcase_image is now a direct URL, not just an ID
  showcase_image_url: string;
  variants: ProductVariant[];
}

export interface ProductDetails {
  id: string;
  name: string;
  description: string | null;
  price: number;
  // All images for the gallery, with public URLs
  images: { id: string; url: string }[];
  // All available colors with their variants
  colors: ProductColor[];
}

export async function fetchProductById(id: string): Promise<ProductDetails | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      images (id, image_url, position),
      product_colors (
        id, 
        name, 
        hex, 
        showcase_image:images(image_url),
        product_variants (id, size, stock)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching product by id:', error?.message);
    return null;
  }

  // Helper to get public URL for an image path
  const getPublicUrl = (path: string | null | undefined) => {
    if (!path) return "";
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  };

  // Process the data into the final, clean structure
  const productDetails: ProductDetails = {
    id: data.id,
    name: data.name,
    description: data.description,
    price: data.price,
    images: (data.images || [])
      .sort((a, b) => a.position - b.position)
      .map(img => ({ id: img.id, url: getPublicUrl(img.image_url) })),
    colors: (data.product_colors || []).map(color => ({
      id: color.id,
      name: color.name,
      hex: color.hex,
      // The query fetches the nested image object, so we extract its URL
      showcase_image_url: getPublicUrl(color.showcase_image?.[0]?.image_url),
      // Rename product_variants to variants for consistency
      variants: color.product_variants.map(variant => ({
        id: variant.id,
        size: variant.size,
        stock: variant.stock
      })),
    })),
  };

  return productDetails;
}

// The fetchArchivedProductById function is now obsolete with the new status check,
// but we will leave it for now to avoid breaking other parts of the app.
// It should be updated or removed later.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchArchivedProductById(_id: string) {
  console.warn("fetchArchivedProductById is disabled.");
  return null;
}
