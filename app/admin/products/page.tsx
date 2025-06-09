"use client";
import { useEffect, useState, ChangeEvent, useMemo } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/utils";

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

// New data structures based on the variant system
interface ProductVariant {
  id?: string;
  size: string;
  stock: number;
}

interface ProductColor {
  id?: string;
  name: string;
  hex: string;
  showcase_image_id?: string | null; // The ID of the image from the 'images' table
  variants: ProductVariant[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  created_at: string;
}

interface ImageRecord {
  id: string;
  image_url: string;
  position: number;
  signedUrl?: string;
}

interface ProductWithDetails extends Product {
  images: ImageRecord[];
  product_colors: ProductColor[];
}


// --- Component ---
export default function AdminProductsPage() {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // States for the 'Add New Product' form
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [images, setImages] = useState<File[]>([]);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // NOTE: Edit functionality will be re-implemented later.
  // const [editProduct, setEditProduct] = useState<ProductWithDetails | null>(null);

  useEffect(() => {
    setLoading(true);
    const checkAdminAndFetch = async (user: import('@supabase/supabase-js').User | null) => {
      try {
        if (user && await isAdmin(user.id)) {
          setAdmin(true);
          await fetchProducts();
        } else {
          setAdmin(false);
          setProducts([]);
        }
      } catch (error) {
        console.error("Error in checkAdminAndFetch:", error);
        setAdmin(false);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      checkAdminAndFetch(user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      checkAdminAndFetch(session?.user ?? null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, description, price, created_at,
          images (id, image_url, position),
          product_colors (
            id, name, hex, showcase_image_id,
            product_variants (id, size, stock)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Process the data to match the new 'ProductWithDetails' interface
      // This is now more robust to handle products that might not have colors/variants yet.
      const processedData = data.map(p => {
        const product_colors = (p.product_colors || []).map(c => ({
            ...c,
            // The DB returns 'product_variants', but our interface needs 'variants'
            variants: c.product_variants || [] 
        }));
        return { ...p, product_colors };
      });
      
      setProducts(processedData as ProductWithDetails[]);

    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  }
  
  // --- Form Input Handlers ---

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length + images.length > 3) {
      setFormError('You can upload up to 3 images.');
      return;
    }
    setImages(prev => [...prev, ...files].slice(0, 3));
  }

  function handleRemoveImage(idx: number) {
    setImages(prev => prev.filter((_, i: number) => i !== idx));
  }

  function handleAddColor() {
    if (newColorName.trim() && newColorHex.trim()) {
      if (productColors.some(c => c.name.toLowerCase() === newColorName.trim().toLowerCase())) {
        setFormError("Color names must be unique.");
        return;
      }
      setProductColors(prev => [
        ...prev, 
        { 
          name: newColorName.trim(), 
          hex: newColorHex.trim(),
          variants: SIZE_OPTIONS.map(size => ({ size, stock: 0 }))
        }
      ]);
      setNewColorName('');
      setNewColorHex('#000000');
      setFormError('');
    }
  }

  function handleRemoveColor(idx: number) {
    setProductColors(prev => prev.filter((_, i) => i !== idx));
  }

  function handleVariantStockChange(colorIndex: number, variantIndex: number, stock: string) {
    const newStock = parseInt(stock, 10);
    setProductColors(prev => prev.map((color, cIdx) => {
      if (cIdx === colorIndex) {
        return {
          ...color,
          variants: color.variants.map((variant, vIdx) => 
            vIdx === variantIndex ? { ...variant, stock: isNaN(newStock) ? 0 : newStock } : variant
          )
        };
      }
      return color;
    }));
  }
  
  function handleShowcaseImageChange(colorIndex: number, imageIndex: string) {
    // Here, we temporarily store the *index* of the image file.
    // We will convert this to a real image ID after the images are uploaded.
    setProductColors(prev => prev.map((color, cIdx) => 
      cIdx === colorIndex ? { ...color, showcase_image_id: imageIndex } : color
    ));
  }

  // --- Product Creation Logic ---
  
  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.price.trim()) { setFormError('Name and price are required.'); return; }
    if (images.length === 0) { setFormError('At least one image is required.'); return; }
    if (productColors.length === 0) { setFormError('At least one color must be added.'); return; }
    if (productColors.some(c => c.showcase_image_id === undefined || c.showcase_image_id === null)) {
        setFormError("Each color must have a showcase image assigned.");
        return;
    }

    setFormLoading(true);

    try {
        // 1. Create Product
        const { data: productData, error: productError } = await supabase.from('products').insert({
            name: form.name.trim(),
            description: form.description.trim(),
            price: parseFloat(form.price),
        }).select().single();
        if (productError) throw productError;

        // 2. Upload and Insert Images, getting back the DB records with IDs
        const uploadedImageRecords: ImageRecord[] = [];
        for (let i = 0; i < images.length; i++) {
            const file = images[i];
            const filePath = `products/${productData.id}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
            if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
            
            const { data: dbImage, error: dbError } = await supabase.from('images').insert({
                product_id: productData.id, image_url: filePath, position: i + 1,
            }).select().single();
            if (dbError) throw dbError;
            uploadedImageRecords.push(dbImage as ImageRecord);
        }

        // 3. Insert Colors and their Variants
        for (const color of productColors) {
            // Find the database ID of the showcase image using the temporary index
            const showcaseImageIndex = parseInt(color.showcase_image_id || '-1', 10);
            const showcaseImageDbId = uploadedImageRecords[showcaseImageIndex]?.id;

            if (!showcaseImageDbId) {
                throw new Error(`Could not find uploaded image for color ${color.name}.`);
            }

            const { data: colorData, error: colorError } = await supabase.from('product_colors').insert({
                product_id: productData.id,
                name: color.name,
                hex: color.hex,
                showcase_image_id: showcaseImageDbId
            }).select().single();
            if (colorError) throw colorError;

            // 4. Insert Variants for each Color
            const variantsToInsert = color.variants
                .filter(v => v.stock > 0) // Only insert variants that have stock
                .map(v => ({
                    product_color_id: colorData.id,
                    size: v.size,
                    stock: v.stock,
                }));
            
            if (variantsToInsert.length > 0) {
                const { error: variantError } = await supabase.from('product_variants').insert(variantsToInsert);
                if (variantError) throw variantError;
            }
        }

        // 5. Reset Form and Refetch Products
        resetForm();
        await fetchProducts();

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setFormError(`Failed to create product: ${errorMessage}`);
        // TODO: Add cleanup logic here if product creation fails midway, e.g., delete uploaded images or the product entry.
    } finally {
        setFormLoading(false);
    }
  }

  function resetForm() {
    setForm({ name: "", description: "", price: "" });
    setImages([]);
    setProductColors([]);
    setNewColorName('');
    setNewColorHex('#000000');
    setShowForm(false);
    setFormError("");
    setFormLoading(false);
  }
  
  // --- Render Logic ---

  if (loading) return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  if (!admin) return <div className="flex justify-center items-center h-screen"><p>You are not authorized to view this page.</p></div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Products</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Add New Product</button>
      </div>

      {showForm ? (
        <div className="bg-white p-8 rounded-lg shadow-lg mb-8 max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold mb-6">Add New Product</h2>
          <form onSubmit={handleCreateProduct}>
            
            {/* Section 1: Product Details */}
            <div className="mb-8 border-b pb-8">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">1. Product Details</h3>
                <div className="grid grid-cols-1 gap-6">
                    <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Product Name" className="p-2 border rounded" required />
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" className="p-2 border rounded" rows={4}></textarea>
                    <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="Price" className="p-2 border rounded" required />
                </div>
            </div>

            {/* Section 2: Upload Images */}
            <div className="mb-8 border-b pb-8">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">2. Upload Images (up to 3)</h3>
                <input type="file" multiple onChange={handleImageChange} accept="image/*" className="mb-4" />
                <div className="flex gap-4">
                    {images.map((file, idx) => (
                        <div key={idx} className="relative">
                            <Image src={URL.createObjectURL(file)} alt="Preview" width={100} height={100} className="rounded" />
                            <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">&times;</button>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Section 3: Define Colors and Stock */}
            <div className="mb-8">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">3. Define Colors and Stock</h3>
                
                {/* Add New Color Form */}
                <div className="flex items-center gap-4 p-4 border rounded-md bg-gray-50 mb-6">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-700">Color Name</label>
                        <input type="text" value={newColorName} onChange={e => setNewColorName(e.target.value)} placeholder="e.g., Midnight Blue" className="p-2 border rounded w-full mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hex</label>
                        <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} className="p-1 h-10 w-14 block bg-white border border-gray-300 rounded-md cursor-pointer" />
                    </div>
                    <button type="button" onClick={handleAddColor} className="self-end bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">Add Color</button>
                </div>

                {/* List of Added Colors */}
                <div className="space-y-6">
                    {productColors.map((color, colorIdx) => (
                        <div key={colorIdx} className="p-4 border rounded-lg shadow-sm bg-white">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div style={{ backgroundColor: color.hex }} className="w-8 h-8 rounded-full border"></div>
                                    <h4 className="font-semibold text-lg">{color.name}</h4>
                                </div>
                                <button type="button" onClick={() => handleRemoveColor(colorIdx)} className="text-red-500 hover:text-red-700">&times; Remove</button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                {/* Showcase Image Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Showcase Image</label>
                                    <select
                                        value={color.showcase_image_id || ''}
                                        onChange={(e) => handleShowcaseImageChange(colorIdx, e.target.value)}
                                        className="p-2 border rounded w-full"
                                        disabled={images.length === 0}
                                    >
                                        <option value="" disabled>Select an image</option>
                                        {images.map((_, imgIdx) => (
                                            <option key={imgIdx} value={imgIdx}>
                                                Image {imgIdx + 1}
                                            </option>
                                        ))}
                                    </select>
                                    {images.length === 0 && <p className="text-xs text-gray-500 mt-1">Upload images first to assign one.</p>}
                                </div>

                                {/* Stock per Size Inputs */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock per Size</label>
                                    <div className="space-y-2">
                                        {color.variants.map((variant, variantIdx) => (
                                            <div key={variantIdx} className="flex items-center gap-4">
                                                <span className="font-medium w-12">{variant.size}</span>
                                                <input
                                                    type="number"
                                                    value={variant.stock}
                                                    onChange={(e) => handleVariantStockChange(colorIdx, variantIdx, e.target.value)}
                                                    placeholder="0"
                                                    className="p-2 border rounded w-full"
                                                    min="0"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}

            <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400">Cancel</button>
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400" disabled={formLoading}>
                    {formLoading ? 'Saving...' : 'Save Product'}
                </button>
            </div>
          </form>
        </div>
      ) : (
        /* Product List Display */
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-6">Existing Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.length > 0 ? products.map(p => (
                    <ProductCard key={p.id} product={p} />
                )) : (
                    <p>No products found.</p>
                )}
            </div>
        </div>
      )}
    </div>
  );
}

// --- Product Card Component for the list ---

const ProductCard = ({ product }: { product: ProductWithDetails }) => {
    
    // Memoize the calculation of total stock to prevent re-renders
    const totalStock = useMemo(() => {
        return product.product_colors.reduce((acc, color) => {
            return acc + color.variants.reduce((colorAcc, variant) => colorAcc + variant.stock, 0);
        }, 0);
    }, [product.product_colors]);

    // Get signed URLs for showcase images
    const [colorImageUrls, setColorImageUrls] = useState<Record<string, string>>({});
    useEffect(() => {
        const fetchImageUrls = async () => {
            const urls: Record<string, string> = {};
            for (const color of product.product_colors) {
                const showcaseImage = product.images.find(img => img.id === color.showcase_image_id);
                if (showcaseImage) {
                    const url = getPublicImageUrl(showcaseImage.image_url);
                    urls[color.id as string] = url;
                }
            }
            setColorImageUrls(urls);
        };
        if (product.product_colors.length > 0) {
            fetchImageUrls();
        }
    }, [product]);

    const firstImageUrl = product.images.length > 0 ? getPublicImageUrl(product.images[0].image_url) : '/placeholder.png';

    return (
        <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <Image
                src={firstImageUrl}
                alt={product.name}
                width={300}
                height={300}
                className="w-full h-48 object-cover"
            />
            <div className="p-4">
                <h3 className="font-bold text-lg">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-2">{product.description.substring(0, 60)}...</p>
                <p className="font-semibold mb-2">${product.price.toFixed(2)}</p>
                
                <div className="mb-3">
                    <h4 className="font-semibold text-sm mb-2">Inventory</h4>
                    {product.product_colors.length > 0 ? (
                        <div className="space-y-2 text-xs">
                            {product.product_colors.map(color => (
                                <div key={color.id} className="flex items-center gap-2 p-1 rounded bg-gray-50">
                                    {colorImageUrls[color.id as string] && (
                                        <Image src={colorImageUrls[color.id as string]} alt={color.name} width={20} height={20} className="rounded-full" />
                                    )}
                                    <div style={{ backgroundColor: color.hex }} className="w-4 h-4 rounded-full border"></div>
                                    <span className="flex-grow font-medium">{color.name}</span>
                                    <span className="text-gray-700">
                                        {color.variants.reduce((sum, v) => sum + v.stock, 0)} units
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <p className="text-xs text-gray-500">No variant inventory defined.</p>
                    )}
                </div>
                <p className="text-sm font-bold">Total Stock: {totalStock}</p>
                 <div className="mt-4 flex justify-end">
                    {/* NOTE: Edit functionality will be restored later. */}
                    <button className="text-sm text-gray-500 cursor-not-allowed" disabled>Edit</button>
                </div>
            </div>
        </div>
    );
};

function getPublicImageUrl(path: string): string {
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
