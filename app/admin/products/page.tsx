"use client";
import { useEffect, useState, ChangeEvent } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/utils";

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

// --- NEW DATA STRUCTURES ---
interface ImageRecord {
  id: string;
  product_color_id: string;
  image_url: string;
  position: number;
  publicUrl?: string; // For displaying existing images
}

interface ProductVariant {
  id?: string;
  size: string;
  stock: number;
}

interface ProductColor {
  id?: string;
  name: string;
  hex: string;
  images: ImageRecord[]; // Each color has its own images
  variants: ProductVariant[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  created_at: string;
}

interface ProductWithDetails extends Product {
  product_colors: ProductColor[];
}

// --- NEW STATE INTERFACE FOR THE FORM ---
interface FormProductColor extends Omit<ProductColor, 'images'> {
  id?: string; // Keep the ID for existing colors
  existingImages: ImageRecord[]; // Images already in the DB
  newImageFiles: File[]; // New images to be uploaded
}

// --- Component ---
export default function AdminProductsPage() {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // --- FORM STATE ---
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [productColors, setProductColors] = useState<FormProductColor[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  
  // --- NEW STATE for editing ---
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  
  // --- Main Effect ---
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

  // --- DATA FETCHING ---
  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, description, price, created_at,
          product_colors (
            id, name, hex,
            images (id, product_color_id, image_url, position),
            product_variants (id, size, stock)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const processedData = data.map(p => ({
        ...p,
        product_colors: (p.product_colors || []).map(c => ({
          ...c,
          variants: c.product_variants || [],
          images: c.images || []
        })),
      }));
      
      setProducts(processedData as ProductWithDetails[]);

    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  }

  // --- FORM HANDLERS ---
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
          existingImages: [],
          newImageFiles: [],
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

  function handleColorImageChange(colorIndex: number, e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    setProductColors(prev => prev.map((color, cIdx) => {
        if (cIdx === colorIndex) {
            // Simple approach: append new files. Capping can be added later if needed.
            return { ...color, newImageFiles: [...color.newImageFiles, ...files] };
        }
        return color;
    }));
  }

  function handleRemoveColorImage(colorIndex: number, imageIndex: number) {
    setProductColors(prev => prev.map((color, cIdx) => {
        if (cIdx === colorIndex) {
            return { ...color, newImageFiles: color.newImageFiles.filter((_, i) => i !== imageIndex) };
        }
        return color;
    }));
  }

  function handleRemoveExistingImage(colorIndex: number, imageId: string) {
    setProductColors(prev => prev.map((color, cIdx) => {
        if (cIdx === colorIndex) {
            return {
                ...color,
                existingImages: color.existingImages.filter(img => img.id !== imageId)
            };
        }
        return color;
    }));
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

  // --- REWRITTEN PRODUCT CREATION LOGIC ---
  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.price.trim()) { setFormError('Name and price are required.'); return; }
    if (productColors.length === 0) { setFormError('At least one color must be added.'); return; }
    if (productColors.some(c => c.newImageFiles.length === 0)) {
        setFormError("Each color must have at least one image.");
      return;
    }

    setFormLoading(true);
    let createdProductId: string | null = null;

    try {
      // 1. Create Product
      const { data: productData, error: productError } = await supabase.from('products').insert({
        name: form.name.trim(),
        description: form.description.trim(),
          price: parseFloat(form.price),
      }).select().single();
      if (productError) throw productError;
      createdProductId = productData.id;

      // 2. Loop through each color, create it, upload its images, and create variants
      for (const color of productColors) {
        // Create the ProductColor entry
        const { data: colorData, error: colorError } = await supabase.from('product_colors').insert({
          product_id: createdProductId,
          name: color.name,
          hex: color.hex,
        }).select().single();
        if (colorError) throw colorError;

        // Upload images for this specific color
        for (let i = 0; i < color.newImageFiles.length; i++) {
          const file = color.newImageFiles[i];
          const filePath = `products/${createdProductId}/${colorData.id}/${Date.now()}-${file.name}`;
          
          const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
          if (uploadError) throw new Error(`Image upload failed for ${color.name}: ${uploadError.message}`);
          
          // Create the image record in the database
          const { error: dbError } = await supabase.from('images').insert({
              product_color_id: colorData.id,
              image_url: filePath,
              position: i + 1, // Position is based on upload order
          });
          if (dbError) throw dbError;
        }

        // Insert Variants for this color
        const variantsToInsert = color.variants
            .filter(v => v.stock > 0)
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

      // 3. Success: Reset Form and Refetch Products
      resetForm();
      await fetchProducts();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setFormError(`Failed to create product: ${errorMessage}`);
      // NOTE: A robust solution would also clean up any partially created data (the product, colors, or images) on failure.
    } finally {
      setFormLoading(false);
    }
  }

  // --- EDIT & DELETE HANDLERS ---
  function handleEditClick(product: ProductWithDetails) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
    });
    
    // Convert loaded data to form format, ensuring all sizes are present for editing
    setProductColors(product.product_colors.map(c => {
      // Create a map of existing variants for quick lookup
      const existingVariants = new Map(c.variants.map(v => [v.size, v.stock]));
      
      // Create a full list of variants for the form, using existing stock or defaulting to 0
      const allVariantsForForm = SIZE_OPTIONS.map(size => ({
        size: size,
        stock: existingVariants.get(size) || 0
      }));

      return {
        id: c.id,
        name: c.name,
        hex: c.hex,
        existingImages: c.images || [],
        newImageFiles: [],
        variants: allVariantsForForm
      };
    }));

    setShowForm(true);
  }

  async function handleUpdateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;

    setFormError("");
    setFormLoading(true);

    try {
        // 1. Update main product details
        const { error: productError } = await supabase
            .from('products')
            .update({
                name: form.name.trim(),
                description: form.description.trim(),
                price: parseFloat(form.price),
            })
            .eq('id', editingProduct.id);
        if (productError) throw productError;

        const originalColors = editingProduct.product_colors;
        const submittedColors = productColors;

        // 2. Identify and delete colors that were removed
        const submittedColorIds = new Set(submittedColors.map(c => c.id).filter(id => id));
        const colorsToDelete = originalColors.filter(c => !submittedColorIds.has(c.id));
        
        for (const color of colorsToDelete) {
            const folderPath = `products/${editingProduct.id}/${color.id}`;
            const { data: files, error: listError } = await supabase.storage.from('product-images').list(folderPath);
            if (listError) console.error(`Could not list files for deletion for color ${color.name}:`, listError);
            if (files && files.length > 0) {
                const filePaths = files.map(file => `${folderPath}/${file.name}`);
                await supabase.storage.from('product-images').remove(filePaths);
            }
            const { error: deleteColorError } = await supabase.from('product_colors').delete().eq('id', color.id);
            if (deleteColorError) throw new Error(`Failed to delete color ${color.name}: ${deleteColorError.message}`);
        }

        // 3. Process submitted colors (update existing or create new)
        for (const color of submittedColors) {
            let currentColorId = color.id;

            if (!currentColorId) {
                const { data: newColorData, error: newColorError } = await supabase
                    .from('product_colors')
                    .insert({ product_id: editingProduct.id, name: color.name, hex: color.hex })
                    .select('id')
                    .single();
                if (newColorError) throw new Error(`Failed to create new color ${color.name}: ${newColorError.message}`);
                currentColorId = newColorData.id;
            } else {
                const { error: updateColorError } = await supabase
                    .from('product_colors')
                    .update({ name: color.name, hex: color.hex })
                    .eq('id', currentColorId);
                if (updateColorError) throw new Error(`Failed to update color ${color.name}: ${updateColorError.message}`);
            }
            
            const originalImages = originalColors.find(c => c.id === currentColorId)?.images || [];
            const existingImageIds = new Set(color.existingImages.map(img => img.id));
            const imagesToDelete = originalImages.filter(img => !existingImageIds.has(img.id));

            if (imagesToDelete.length > 0) {
                const imagePathsToDelete = imagesToDelete.map(img => img.image_url);
                await supabase.storage.from('product-images').remove(imagePathsToDelete);
                
                const imageIdsToDelete = imagesToDelete.map(img => img.id);
                const { error: dbError } = await supabase.from('images').delete().in('id', imageIdsToDelete);
                if (dbError) throw new Error(`Failed to delete image records from DB: ${dbError.message}`);
            }

            if (color.newImageFiles.length > 0) {
                 for (let i = 0; i < color.newImageFiles.length; i++) {
                    const file = color.newImageFiles[i];
                    const filePath = `products/${editingProduct.id}/${currentColorId}/${Date.now()}-${file.name}`;
                    
                    await supabase.storage.from('product-images').upload(filePath, file);
                    
                    const maxPosition = Math.max(0, ...color.existingImages.map(img => img.position));
                    const { error: dbError } = await supabase.from('images').insert({
                        product_color_id: currentColorId,
                        image_url: filePath,
                        position: maxPosition + i + 1,
                    });
                    if (dbError) throw dbError;
                }
            }

            const { error: deleteVariantError } = await supabase
                .from('product_variants')
                .delete()
                .eq('product_color_id', currentColorId!);
            if (deleteVariantError) throw new Error(`Failed to clear old variants for color ${color.name}: ${deleteVariantError.message}`);

            const variantsToInsert = color.variants
                .filter(v => v.stock > 0)
                .map(v => ({
                    product_color_id: currentColorId!,
                    size: v.size,
                    stock: v.stock,
                }));
            
            if (variantsToInsert.length > 0) {
                const { error: insertVariantError } = await supabase.from('product_variants').insert(variantsToInsert);
                if (insertVariantError) throw new Error(`Failed to insert new variants for color ${color.name}: ${insertVariantError.message}`);
            }
        }

        await fetchProducts();
        resetForm();

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setFormError(`Failed to update product: ${errorMessage}`);
    } finally {
        setFormLoading(false);
    }
  }

  // --- NEW DELETE LOGIC ---
  async function handleDeleteProduct(product: ProductWithDetails) {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // 1. Delete all images from Supabase Storage first.
      // This requires listing all files in all of the product's color folders.
      for (const color of product.product_colors) {
        const folderPath = `products/${product.id}/${color.id}`;
        const { data: files, error: listError } = await supabase.storage.from('product-images').list(folderPath);

        if (listError) {
          console.error(`Could not list files for deletion for color ${color.name}:`, listError);
          // Continue to attempt deletion of DB record anyway
        }

        if (files && files.length > 0) {
          const filePaths = files.map(file => `${folderPath}/${file.name}`);
          const { error: removeError } = await supabase.storage.from('product-images').remove(filePaths);
          if (removeError) {
            // Log the error but don't block the product deletion
            console.error(`Failed to delete some images from storage for color ${color.name}:`, removeError);
          }
        }
      }

      // 2. Delete the product from the database.
      // Thanks to CASCADE settings, this will also delete all related product_colors, images, and product_variants.
      const { error: deleteError } = await supabase.from('products').delete().eq('id', product.id);
      if (deleteError) throw deleteError;

      // 3. Update the UI state to reflect the deletion.
      setProducts(prev => prev.filter(p => p.id !== product.id));

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      alert(`Failed to delete product: ${errorMessage}`);
    }
    setFormError("");
    setFormLoading(false);
    setEditingProduct(null); // Also reset the editing state
  }

  function resetForm() {
    setForm({ name: "", description: "", price: "" });
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
          <h2 className="text-xl font-semibold mb-6">{editingProduct ? "Edit Product" : "Create New Product"}</h2>
          <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}>
            
            {/* Section 1: Product Details */}
            <div className="mb-8 border-b pb-8">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">1. Product Details</h3>
                <div className="grid grid-cols-1 gap-6">
                    <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Product Name" className="p-2 border rounded" required />
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" className="p-2 border rounded" rows={4}></textarea>
                    <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="Price" className="p-2 border rounded" required />
          </div>
            </div>
            
            {/* Section 2: Define Colors, Images, and Stock */}
            <div className="mb-8">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">2. Define Colors, Images, and Stock</h3>
                
                {/* Add New Color Form */}
                <div className="flex items-end gap-4 p-4 border rounded-md bg-gray-50 mb-6">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-700">New Color Name</label>
                        <input type="text" value={newColorName} onChange={e => setNewColorName(e.target.value)} placeholder="e.g., Midnight Blue" className="p-2 border rounded w-full mt-1" />
                  </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hex</label>
                        <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} className="p-1 h-10 w-14 block bg-white border border-gray-300 rounded-md cursor-pointer" />
            </div>
                    <button type="button" onClick={handleAddColor} className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 h-10">Add Color</button>
                </div>

                {/* List of Added Colors */}
                <div className="space-y-6">
                  {productColors.map((color, colorIdx) => (
                    <div key={colorIdx} className="p-4 border rounded-lg shadow-sm bg-white">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div style={{ backgroundColor: color.hex }} className="w-8 h-8 rounded-full border"></div>
                            <h4 className="font-semibold text-lg">{color.name}</h4>
            </div>
                        <button type="button" onClick={() => handleRemoveColor(colorIdx)} className="text-red-500 hover:text-red-700 font-semibold">&times; Remove Color</button>
                      </div>
                      
                      {/* Per-Color Image Uploader */}
                      <div className="mb-4 p-4 border-2 border-dashed rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Images for {color.name}</label>
                        
                        {color.existingImages.length > 0 && (
                            <div className="flex gap-4 mb-4 flex-wrap border-b pb-4">
                                {color.existingImages.map((image) => (
                                    <div key={image.id} className="relative">
                                        <Image src={getPublicImageUrl(image.image_url)} alt="Existing product image" width={100} height={100} className="rounded object-cover" />
                                        <button type="button" onClick={() => handleRemoveExistingImage(colorIdx, image.id)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center -mt-1 -mr-1">&times;</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload New Images</label>
                        <input
                          type="file" 
                          multiple 
                          onChange={(e) => handleColorImageChange(colorIdx, e)} 
                          accept="image/*" 
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <div className="flex gap-4 mt-4 flex-wrap">
                          {color.newImageFiles.map((file, imgIdx) => (
                              <div key={imgIdx} className="relative">
                                  <Image src={URL.createObjectURL(file)} alt="Preview" width={100} height={100} className="rounded object-cover" />
                                  <button type="button" onClick={() => handleRemoveColorImage(colorIdx, imgIdx)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center -mt-1 -mr-1">&times;</button>
                              </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">The first image uploaded becomes the primary showcase image.</p>
                      </div>

                      {/* Stock per Size Inputs */}
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Stock per Size</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            {color.variants.map((variant, variantIdx) => (
                                <div key={variantIdx}>
                                    <label className="block text-xs font-bold text-center mb-1">{variant.size}</label>
                    <input
                      type="number"
                                        value={variant.stock}
                                        onChange={(e) => handleVariantStockChange(colorIdx, variantIdx, e.target.value)}
                                        placeholder="0"
                                        className="p-2 border rounded w-full text-center"
                      min="0"
                    />
                  </div>
                ))}
              </div>
            </div>
                    </div>
                  ))}
                </div>
            </div>

            {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}

            <div className="flex justify-end gap-4 mt-8">
                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400">Cancel</button>
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400" disabled={formLoading}>
                    {formLoading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Save Product')}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Product List Display */
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50">
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
                <ProductRow 
                  key={product.id} 
                  product={product}
                  onEdit={() => handleEditClick(product)}
                  onDelete={() => handleDeleteProduct(product)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- UPDATED PRODUCT ROW COMPONENT ---

function getPublicImageUrl(path: string): string {
    if (!path) return '/placeholder.png';
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
}

const ProductRow = ({ product, onEdit, onDelete }: { product: ProductWithDetails, onEdit: () => void, onDelete: () => void }) => {
    // Find the very first image of the first color to show in the table.
    const firstColor = product.product_colors?.[0];
    const showcaseImage = firstColor?.images?.find(img => img.position === 1);
    const firstImageUrl = showcaseImage ? getPublicImageUrl(showcaseImage.image_url) : '/placeholder.png';
    
    return (
        <tr className="hover:bg-gray-50">
            <td className="p-3 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <Image
                        src={firstImageUrl}
                        alt={product.name}
                        width={64}
                        height={64}
                        className="rounded-md object-cover"
                    />
                    <div>
                        <p className="font-bold">{product.name}</p>
                        <p className="text-xs text-gray-500 max-w-xs truncate">{product.description}</p>
                    </div>
                </div>
            </td>
            <td className="p-3 border-b border-gray-200 align-top">
                <div className="flex flex-col gap-2">
                    {product.product_colors.length > 0 ? (
                        product.product_colors.map(color => (
                            <div key={color.id} className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: color.hex }} title={color.name}></div>
                                <span className="text-xs font-mono whitespace-nowrap">
                                    {color.variants.map(v => `${v.size}:(${v.stock})`).join(' ')}
                                </span>
                            </div>
                        ))
                    ) : (
                        <span className="text-xs text-gray-500">No variants defined</span>
                    )}
                </div>
            </td>
            <td className="p-3 border-b border-gray-200 align-top">
                ${product.price.toFixed(2)}
            </td>
            <td className="p-3 border-b border-gray-200 align-top text-sm text-gray-600">
                {new Date(product.created_at).toLocaleDateString()}
            </td>
            <td className="p-3 border-b border-gray-200 align-top">
                <div className="flex items-center gap-4">
                    <button 
                      onClick={onEdit}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={onDelete} 
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                </div>
            </td>
        </tr>
    );
};
