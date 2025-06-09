import { supabase } from "./supabase";

// --- NEW, UNIFIED DATA STRUCTURES ---

export interface Image {
  id: string;
  url: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  size: string;
  stock: number;
}

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  images: Image[]; // Each color has its own gallery
  variants: ProductVariant[];
}

export interface ProductDetails {
  id: string;
  name: string;
  description: string | null;
  price: number;
  colors: ProductColor[];
}

// Simplified type for product list pages
export interface ProductListItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string; // URL of the showcase image for the first color
}


// Helper to get public URL for an image path
const getPublicUrl = (path: string | null | undefined): string => {
  if (!path) return "";
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
};

// --- REWRITTEN DATA FETCHING FUNCTIONS ---

// Fetch products for collection or archive based on status
async function fetchProductList(status: 'collection' | 'archive'): Promise<ProductListItem[]> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      price,
      product_colors (
        name,
        hex,
        images (
          image_url,
          position
        )
      )
    `)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error(`Error fetching ${status} products:`, error?.message);
    return [];
  }

  // Process the data to get the primary image for the first color
  return data.map(product => {
    const firstColor = product.product_colors?.[0];
    const showcaseImage = firstColor?.images?.find(img => img.position === 1);
    const imageUrl = getPublicUrl(showcaseImage?.image_url);
    
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: imageUrl || "/placeholder.png", // Fallback image
    };
  });
}

export function fetchProducts(): Promise<ProductListItem[]> {
  return fetchProductList('collection');
}

export function fetchArchivedProducts(): Promise<ProductListItem[]> {
  return fetchProductList('archive');
}


// Fetch all details for a single product page
export async function fetchProductById(id: string): Promise<ProductDetails | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      product_colors (
        id, 
        name, 
        hex, 
        images (id, image_url, position),
        product_variants (id, size, stock)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching product by id:', error?.message);
    return null;
  }

  // Process the raw data into the final, clean structure
  const productDetails: ProductDetails = {
    id: data.id,
    name: data.name,
    description: data.description,
    price: data.price,
    colors: (data.product_colors || []).map(color => ({
      id: color.id,
      name: color.name,
      hex: color.hex,
      images: (color.images || [])
        .sort((a, b) => a.position - b.position)
        .map(img => ({ 
            id: img.id, 
            url: getPublicUrl(img.image_url),
            position: img.position
        })),
      variants: (color.product_variants || []).map(variant => ({
        id: variant.id,
        size: variant.size,
        stock: variant.stock
      })),
    })),
  };

  return productDetails;
}

// This function is now fully obsolete.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchArchivedProductById(_id: string) {
  console.warn("fetchArchivedProductById is disabled and obsolete.");
  return null;
}
