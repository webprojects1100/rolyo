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

type ProductImage = { image_url: string; position: number };

export async function fetchProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      images (image_url, position),
      sizes (size, stock)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching product by id:', error?.message);
    return null;
  }

  // Return sorted image paths (root-level)
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    price: data.price,
    images: data.images?.length > 0
      ? (data.images as ProductImage[]).sort((a, b) => a.position - b.position).map((img) => {
          const imagePath = img.image_url;
          if (imagePath.startsWith("http") || imagePath.startsWith("/")) {
            return imagePath;
          } else {
            const { data: publicUrlData } = supabase.storage
              .from("product-images")
              .getPublicUrl(imagePath);
            return publicUrlData?.publicUrl || ""; // Or a placeholder if preferred
          }
        })
      : [],
    sizes: data.sizes?.map((s: { size: string; stock: number }) => ({
      size: s.size,
      stock: s.stock
    })) || [],
  };
}

export async function fetchArchivedProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      images (image_url, position),
      sizes (size)
    `)
    .eq('id', id)
    .eq('status', 'archive')
    .single();

  if (error || !data) {
    console.error('Error fetching archived product by id:', error?.message);
    return null;
  }

  // Return sorted image paths (root-level)
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    price: data.price,
    images: data.images?.length > 0
      ? (data.images as ProductImage[]).sort((a, b) => a.position - b.position).map((img) => img.image_url)
      : [],
    sizes: data.sizes?.map((s: { size: string }) => ({
      size: s.size
    })) || [],
  };
}
