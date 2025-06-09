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
                showcase_image_id: showcaseImageDbId,
            }).select().single();
            if (colorError) throw colorError;

            const variantsToInsert = color.variants.filter(v => v.stock > 0).map(v => ({
                product_id: productData.id, color_id: colorData.id, size: v.size, stock: v.stock,
            }));
            
            if (variantsToInsert.length > 0) {
                const { error: variantError } = await supabase.from('product_variants').insert(variantsToInsert);
                if (variantError) throw variantError;
            }
        }

        // 4. Reset Form and Refetch
        await fetchProducts();
        setShowForm(false);
        setForm({ name: "", description: "", price: "" });
        setImages([]);
        setProductColors([]);
    } catch (error) {
        const e = error as Error;
        console.error('An unexpected error occurred during product creation:', e);
        setFormError('An unexpected error occurred: ' + e.message);
    } finally {
        setFormLoading(false);
    }
  }


  // --- Helper & Render Functions ---

  function getPublicImageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:')) return path;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data?.publicUrl || '';
  }
  
  const tempImageUrls = useMemo(() => images.map(file => URL.createObjectURL(file)), [images]);
  
  useEffect(() => {
    // Cleanup blob URLs on component unmount
    return () => {
      tempImageUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [tempImageUrls]);

  if (loading) return <div className="max-w-2xl mx-auto py-10 text-center">Loading...</div>;
  if (!admin) return <div className="max-w-2xl mx-auto py-10 text-center text-red-600 font-bold">Access Denied: Admins Only</div>;

  // --- JSX ---
  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Admin: Manage Products</h1>
      <button className="mb-6 bg-black text-white px-4 py-2 rounded" onClick={() => setShowForm(!showForm)}>
        {showForm ? "Cancel" : "Add New Product"}
      </button>

      {/* ADD NEW PRODUCT FORM */}
      {showForm && (
        <form onSubmit={handleCreateProduct} className="mb-8 p-6 border rounded bg-gray-50 space-y-6">
          {/* Basic Details */}
          <fieldset className="space-y-2">
            <legend className="font-semibold text-lg">1. Product Details</legend>
            <input type="text" placeholder="Product Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" required />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2" />
            <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full border rounded px-3 py-2" required />
          </fieldset>

          {/* Image Upload */}
          <fieldset className="space-y-2">
            <legend className="font-semibold text-lg">2. Upload Images (up to 3)</legend>
            <input type="file" multiple onChange={handleImageChange} className="mt-1" accept="image/*" />
            <div className="mt-2 flex gap-2">
              {tempImageUrls.map((url, i) => (
                <div key={i} className="relative">
                  <Image src={url} alt={`preview ${i}`} width={100} height={100} className="rounded object-cover" />
                  <button type="button" onClick={() => handleRemoveImage(i)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs">&times;</button>
                </div>
              ))}
            </div>
          </fieldset>
          
          {/* Color & Variant Management */}
          <fieldset className="space-y-4">
            <legend className="font-semibold text-lg">3. Define Colors and Stock</legend>
            
            {/* Add new color input */}
            <div className="flex items-end gap-2 p-2 border-t pt-4">
              <div className="flex-grow">
                <label className="block text-sm font-medium">Color Name</label>
                <input type="text" value={newColorName} onChange={(e) => setNewColorName(e.target.value)} placeholder="e.g., Midnight Blue" className="border rounded px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Hex</label>
                <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="h-10 w-12 p-1 border rounded" />
              </div>
              <button type="button" onClick={handleAddColor} className="bg-gray-200 px-4 py-2 rounded h-10">Add Color</button>
            </div>

            {/* List of added colors and their variants */}
            <div className="space-y-4">
              {productColors.map((color, cIdx) => (
                <div key={cIdx} className="p-4 border rounded-lg bg-white">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div style={{ backgroundColor: color.hex }} className="w-8 h-8 rounded-full border"></div>
                      <span className="font-semibold text-lg">{color.name}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveColor(cIdx)} className="text-red-500 font-semibold">&times; Remove</button>
                  </div>

                  {/* Showcase Image Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Select Showcase Image for {color.name}:</label>
                    <div className="flex gap-3">
                      {images.map((file, imgIdx) => (
                        <button 
                            type="button" 
                            key={imgIdx} 
                            onClick={() => handleShowcaseImageChange(cIdx, String(imgIdx))}
                            className={`rounded-lg border-2 overflow-hidden ${color.showcase_image_id === String(imgIdx) ? 'border-blue-500 ring-2 ring-blue-500' : 'border-transparent'}`}
                        >
                          <Image src={URL.createObjectURL(file)} alt={`Image ${imgIdx + 1}`} width={80} height={80} className="object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Variant Stock Inputs */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Set Stock for {color.name}:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {color.variants.map((variant, vIdx) => (
                        <div key={variant.size}>
                          <label className="block text-xs font-bold text-center mb-1">{variant.size}</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={variant.stock}
                            onChange={e => handleVariantStockChange(cIdx, vIdx, e.target.value)}
                            className="border rounded px-2 py-1 w-full text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          {formError && <div className="text-red-600 text-sm mb-2">{formError}</div>}
          <button type="submit" className="bg-black text-white px-6 py-3 rounded disabled:opacity-60 w-full font-semibold" disabled={formLoading}>
            {formLoading ? "Saving Product..." : "Save Product"}
          </button>
        </form>
      )}

      {/* PRODUCT LIST TABLE */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left text-sm font-semibold text-gray-600 border-b">Product</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600 border-b">Variants & Stock</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600 border-b">Price</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600 border-b">Created</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="p-3 border-b">
                  <div className="flex items-center gap-4">
                    <Image
                      src={getPublicImageUrl(product.images.find(img => img.position === 1)?.image_url || '')}
                      alt={product.name}
                      width={64}
                      height={64}
                      className="rounded-md object-cover"
                    />
                    <div>
                      <p className="font-bold">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 border-b align-top">
                  <div className="flex flex-col gap-2">
                    {product.product_colors && product.product_colors.length > 0 ? (
                      product.product_colors.map(color => (
                        <div key={color.id} className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: color.hex }} title={color.name}></div>
                          <span className="text-xs font-mono">
                            {color.variants.map(v => `${v.size}:(${v.stock})`).join(' ')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">No variants defined</span>
                    )}
                  </div>
                </td>
                <td className="p-3 border-b">₱{product.price}</td>
                <td className="p-3 border-b text-sm text-gray-600">{new Date(product.created_at).toLocaleDateString()}</td>
                <td className="p-3 border-b">
                  <button className="text-blue-600 underline text-sm" disabled>Edit</button> {/* Edit to be implemented */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The edit modal is removed for now and will be rebuilt */}
    </div>
  );
}
