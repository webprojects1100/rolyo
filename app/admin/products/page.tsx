"use client";
import { useEffect, useState, ChangeEvent } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/utils";

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  created_at: string;
}

interface ProductWithDetails extends Product {
  images: { image_url: string; position: number; id?: string; signedUrl?: string }[];
  sizes: { size: string; stock: number; id?: string }[];
}

export default function AdminProductsPage() {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductWithDetails | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", price: "" });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [sizes, setSizes] = useState<{ size: string; stock: string }[]>(SIZE_OPTIONS.map(size => ({ size, stock: '' })));
  const [imageUploadError, setImageUploadError] = useState("");
  const [editImages, setEditImages] = useState<{ url: string; file?: File; id?: string; dbPath?: string }[]>([]);
  const [editSizes, setEditSizes] = useState<{ size: string; stock: string; id?: string }[]>([]);
  const [editImageUploadError, setEditImageUploadError] = useState("");

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
        .select(`id, name, description, price, created_at, images (image_url, position, id), sizes (size, stock, id)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setProducts(data);
      else setProducts([]);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    setImageUploadError('');
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length + images.length > 3) {
      setImageUploadError('You can upload up to 3 images.');
      return;
    }
    setImages(prev => [...prev, ...files].slice(0, 3));
  }

  function handleRemoveImage(idx: number) {
    setImages(prev => prev.filter((_, i: number) => i !== idx));
  }

  function handleSizeStockChange(idx: number, value: string) {
    setSizes(prev => prev.map((s: { size: string; stock: string }, i: number) => i === idx ? { ...s, stock: value } : s));
  }

  async function uploadImages(productId: string): Promise<{ path: string; position: number }[] | null> {
    const uploadedPaths: { path: string; position: number }[] = [];
    if (images.length === 0) return [];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const ext = file.name.split('.').pop();
      const filePath = `products/${productId}/${i + 1}.${ext}`;
      try {
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error('Supabase Storage upload error:', uploadError);
          setImageUploadError(`Upload failed for ${file.name}: ${uploadError.message}`);
          return null;
        }
        uploadedPaths.push({ path: filePath, position: i + 1 });
      } catch (err) {
        console.error('Exception during image upload:', err);
        setImageUploadError(`Upload failed for ${file.name}: ${(err instanceof Error ? err.message : String(err))}`);
        return null;
      }
    }
    setImageUploadError("");
    return uploadedPaths;
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setImageUploadError("");

    if (!form.name.trim() || !form.price.trim()) {
      setFormError('Name and price are required.');
      return;
    }
    const priceValue = parseFloat(form.price);
    if (isNaN(priceValue) || priceValue < 0) {
      setFormError('Price must be a valid non-negative number.');
      return;
    }
    if (images.length === 0) {
      setImageUploadError('At least one image is required.');
      return;
    }

    setFormLoading(true);
    try {
      const { data: productData, error: productError } = await supabase.from('products').insert({
        name: form.name.trim(),
        description: form.description.trim(),
        price: priceValue,
        status: 'collection',
      }).select().single();

      if (productError || !productData) {
        console.error('Supabase DB insert error (product):', productError);
        setFormError(productError?.message || 'Failed to create product.');
        return;
      }

      const uploadedImageDetails = await uploadImages(productData.id);

      if (!uploadedImageDetails) {
        console.warn(`Product ${productData.id} created, but image upload failed. Consider cleanup.`);
        if (!imageUploadError) setFormError('Image upload failed. Product created without images.');
        return;
      }

      if (uploadedImageDetails.length > 0) {
        for (const img of uploadedImageDetails) {
          const { error: insertError } = await supabase.from('images').insert({
            product_id: productData.id,
            image_url: img.path,
            position: img.position,
          });
          if (insertError) {
            console.error('Supabase DB insert error (images):', insertError);
            setFormError(`Failed to save image ${img.position} record: ${insertError.message}`);
            return;
          }
        }
      }

      for (const s of sizes) {
        const stock = parseInt(s.stock, 10);
        if (!isNaN(stock) && stock >= 0) {
          const { error: sizeError } = await supabase.from('sizes').insert({
            product_id: productData.id,
            size: s.size,
            stock,
          });
          if (sizeError) {
            console.error('Supabase DB insert error (sizes):', sizeError);
            setFormError(`Failed to save size ${s.size}: ${sizeError.message}`);
            return;
          }
        }
      }

      setShowForm(false);
      setForm({ name: '', description: '', price: '' });
      setImages([]);
      setSizes(SIZE_OPTIONS.map((size: string) => ({ size, stock: '' })));
      await fetchProducts();

    } catch (err) {
      console.error('Unexpected error in handleCreateProduct:', err);
      setFormError('An unexpected error occurred: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setFormLoading(false);
    }
  }

  function startEdit(product: ProductWithDetails) {
    setEditProduct(product);
    setEditForm({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
    });
    setEditError("");
    setEditImageUploadError("");

    const sortedImages = (product.images || []).sort((a, b) => a.position - b.position);
    setEditImages(sortedImages.map(img => ({
      url: getPublicImageUrl(img.image_url),
      id: img.id,
      dbPath: img.image_url,
      file: undefined,
    })));
    
    setEditSizes(
      SIZE_OPTIONS.map(size => {
        const found = (product.sizes || []).find(s => s.size === size);
        return { size, stock: found ? String(found.stock) : "", id: found?.id };
      })
    );
  }

  function handleEditImageChange(e: ChangeEvent<HTMLInputElement>) {
    setEditImageUploadError("");
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (editImages.length + files.length > 3) {
        setEditImageUploadError('You can have up to 3 images in total.');
        e.target.value = "";
        return;
    }
    
    const newImageObjects = files.map(f => {
      let blobUrl = '';
      try {
        blobUrl = URL.createObjectURL(f);
      } catch (error) {
        console.warn(`Could not create blob URL for file: ${f.name}`, error);
      }
      
      return {
        url: blobUrl || '',
        file: f,
        id: undefined,
        dbPath: undefined
      };
    }).filter(item => item.url);
    
    setEditImages(prev => [...prev, ...newImageObjects].slice(0, 3)); 
    e.target.value = "";
  }

  function handleRemoveEditImage(idx: number) {
    const imageToRemove = editImages[idx];
    if (imageToRemove && imageToRemove.file && imageToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url);
    }
    setEditImages(prev => prev.filter((_, i) => i !== idx));
    setEditImageUploadError("");
  }

  function handleEditSizeStockChange(idx: number, value: string) {
    setEditSizes(prev => prev.map((s, i) => i === idx ? { ...s, stock: value } : s));
  }

  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");
    setEditImageUploadError("");

    if (!editForm.name.trim() || !editForm.price.trim()) {
      setEditError("Name and price are required.");
      return;
    }
    const priceValue = parseFloat(editForm.price);
    if (isNaN(priceValue) || priceValue < 0) {
      setEditError("Price must be a valid non-negative number.");
      return;
    }
    if (!editProduct) return;

    if (editImages.length === 0) {
        setEditImageUploadError("Product must have at least one image.");
        return;
    }

    setEditLoading(true);
    try {
      const { error: productUpdateError } = await supabase
        .from("products")
        .update({
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          price: priceValue,
        })
        .eq("id", editProduct.id);

      if (productUpdateError) {
        setEditError(`Product update failed: ${productUpdateError.message}`);
        return;
      }

      const originalImagePaths = (editProduct.images || []).map(img => img.image_url);
      const currentImageDbPaths = editImages.filter(img => !img.file && img.dbPath).map(img => img.dbPath);
      const imagesToDeletePaths: string[] = [];

      for (const originalPath of originalImagePaths) {
        if (!currentImageDbPaths.includes(originalPath)) {
          imagesToDeletePaths.push(originalPath);
        }
      }

      if (imagesToDeletePaths.length > 0) {
        const { error: storageDeleteError } = await supabase.storage
          .from('product-images')
          .remove(imagesToDeletePaths);
        if (storageDeleteError) {
          console.error("Storage deletion error:", storageDeleteError);
          setEditError(`Failed to delete some images from storage: ${storageDeleteError.message}. Please check storage manually.`);
        }

        for (const pathToDelete of imagesToDeletePaths) {
          const imageRecordToDelete = editProduct.images.find(img => img.image_url === pathToDelete);
          if (imageRecordToDelete && imageRecordToDelete.id) {
            const { error: dbDeleteError } = await supabase
              .from('images')
              .delete()
              .eq('id', imageRecordToDelete.id);
            if (dbDeleteError) {
              console.error(`DB deletion error for image ${pathToDelete}:`, dbDeleteError);
            }
          }
        }
      }

      let currentPosition = 1;
      for (const imgData of editImages) {
        if (imgData.file) {
          const ext = imgData.file.name.split('.').pop();
          const newFilePath = `products/${editProduct.id}/${currentPosition}.${ext}`;
          
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(newFilePath, imgData.file, { upsert: true });

          if (uploadError) {
            setEditImageUploadError(`Upload failed for new image at position ${currentPosition}: ${uploadError.message}`);
            return; 
          }
          const { error: insertDbError } = await supabase.from('images').insert({
            product_id: editProduct.id,
            image_url: newFilePath,
            position: currentPosition,
          });
          if (insertDbError) {
            setEditImageUploadError(`DB insert failed for new image ${newFilePath}: ${insertDbError.message}`);
            return; 
          }
        } else if (imgData.id && imgData.dbPath) {
          const existingImageRecord = editProduct.images.find(origImg => origImg.id === imgData.id);
          if (existingImageRecord && existingImageRecord.position !== currentPosition) {
            const { error: updatePosError } = await supabase
              .from('images')
              .update({ position: currentPosition })
              .eq('id', imgData.id);
            if (updatePosError) {
              setEditImageUploadError(`Position update failed for image ${imgData.dbPath}: ${updatePosError.message}`);
              console.error("Position update error:", updatePosError)
            }
          }
        }
        currentPosition++;
      }
      
      for (const s of editSizes) {
        const stock = parseInt(s.stock, 10);
        if (!isNaN(stock) && stock >= 0) {
          if (s.id) {
            const { error: sizeUpdateError } = await supabase.from('sizes').update({ stock }).eq('id', s.id);
            if (sizeUpdateError) {
                setEditError(`Failed to update size ${s.size}: ${sizeUpdateError.message}`); return;
            }
          } else {
            const { error: sizeInsertError } = await supabase.from('sizes').insert({ product_id: editProduct.id, size: s.size, stock });
            if (sizeInsertError) {
                setEditError(`Failed to add size ${s.size}: ${sizeInsertError.message}`); return;
            }
          }
        } else if (s.id && (s.stock.trim() === '' || stock < 0)) {
          const { error: sizeDeleteError } = await supabase.from('sizes').delete().eq('id', s.id);
          if (sizeDeleteError) {
            setEditError(`Failed to delete size ${s.size}: ${sizeDeleteError.message}`); return;
          }
        }
      }

      setEditProduct(null);
      await fetchProducts();

    } catch (err) {
      console.error('Unexpected error in handleEditProduct:', err);
      setEditError('An unexpected error occurred: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
  }

  function getPublicImageUrl(path: string): string {
    if (!path) {
      return '';
    }
    // If it's already a full URL (e.g., from a local file preview or an absolute URL somehow stored)
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('/')) {
      return path;
    }
    // Use Supabase's built-in method for generating public URLs
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    
    // data.publicUrl will be null if the object does not exist or if access is denied (e.g. RLS or file not public)
    // However, for public buckets, it should generally return the URL.
    return data?.publicUrl || ''; 
  }

  if (loading) return <div className="max-w-2xl mx-auto py-10 text-center">Loading...</div>;
  if (!admin) return <div className="max-w-2xl mx-auto py-10 text-center text-red-600 font-bold">Access Denied: Admins Only</div>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Admin: Manage Products</h1>
      <button
        className="mb-6 bg-black text-white px-4 py-2 rounded"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? "Cancel" : "Add New Product"}
      </button>
      {showForm && (
        <form onSubmit={handleCreateProduct} className="mb-8 p-4 border rounded bg-gray-50">
          <div className="mb-2">
            <input
              type="text"
              placeholder="Product Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div className="mb-2">
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="mb-2">
            <input
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div className="mb-2">
            <label className="block mb-1 font-medium">Product Images (up to 3)</label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer bg-gray-100 border border-gray-300 px-4 py-2 rounded hover:bg-gray-200 transition font-medium">
                <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                Choose Images
              </label>
              <span className="text-xs text-gray-500">or drag & drop</span>
            </div>
            {imageUploadError && <div className="text-red-600 text-sm mt-1">{imageUploadError}</div>}
            <div className="flex gap-2 mt-2">
              {images.map((img, idx) => {
                let previewUrl = '';
                try {
                  previewUrl = URL.createObjectURL(img);
                } catch (error) {
                  console.warn(`Error creating object URL for preview image at index ${idx}:`, error);
                }

                return (
                  <div key={idx} className="relative w-24 h-24 bg-gray-200 rounded overflow-hidden flex items-center justify-center group">
                    {previewUrl ? (
                      <Image
                        src={previewUrl}
                        alt={`preview-${idx}`}
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                        unoptimized={true}
                      />
                    ) : (
                      <div className="text-xs text-gray-500">Preview error</div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-black bg-opacity-60 text-white rounded-full w-6 h-6 flex items-center justify-center p-0.5 opacity-80 hover:opacity-100 transition"
                      title="Remove image"
                      style={{ lineHeight: 1, fontSize: '1.25rem', fontWeight: 700 }}
                    >
                      <span className="flex items-center justify-center w-full h-full">&times;</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mb-2">
            <label className="block mb-1 font-medium">Sizes & Stock</label>
            <div className="grid grid-cols-2 gap-2">
              {sizes.map((s, idx) => (
                <div key={s.size} className="flex items-center gap-2">
                  <span className="w-10">{s.size}</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Stock"
                    value={s.stock}
                    onChange={e => handleSizeStockChange(idx, e.target.value)}
                    className="border rounded px-2 py-1 w-20"
                  />
                </div>
              ))}
            </div>
          </div>
          {formError && <div className="text-red-600 text-sm mb-2">{formError}</div>}
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-60"
            disabled={formLoading}
          >
            {formLoading ? "Saving..." : "Save Product"}
          </button>
        </form>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Image</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Description</th>
              <th className="p-2 border">Price</th>
              <th className="p-2 border">Sizes/Stock</th>
              <th className="p-2 border">Created</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(products as ProductWithDetails[]).map((product) => {
              let tableImageUrl = '';
              const primaryProductImage = product.images?.find(img => img.position === 1);
              if (primaryProductImage && primaryProductImage.image_url) {
                tableImageUrl = getPublicImageUrl(primaryProductImage.image_url);
              }
              
              let isValidImageUrl = false;
              try {
                if (tableImageUrl && (tableImageUrl.startsWith('blob:') || tableImageUrl.startsWith('/') || tableImageUrl.startsWith('http'))) {
                  isValidImageUrl = true;
                  
                  // Extra validation for http URLs
                  if (tableImageUrl.startsWith('http')) {
                    new URL(tableImageUrl);
                  }
                }
              } catch (error) {
                console.warn(`Invalid image URL for product ${product.id}:`, error);
                isValidImageUrl = false;
              }

              return (
                <tr key={product.id}>
                  <td className="p-2 border">
                    {isValidImageUrl ? (
                      <Image
                        src={tableImageUrl}
                        alt={product.name}
                        width={60}
                        height={60}
                        className="rounded object-cover"
                        unoptimized={true}
                      />
                    ) : (
                      <div style={{ width: 60, height: 60 }} className="flex items-center justify-center bg-gray-100 text-xs text-gray-400">
                        No Image
                      </div>
                    )}
                  </td>
                  <td className="p-2 border">{product.name}</td>
                  <td className="p-2 border">{product.description}</td>
                  <td className="p-2 border">₱{product.price}</td>
                  <td className="p-2 border text-xs">
                    {product.sizes && product.sizes.length > 0 ? (
                      product.sizes.map(s => `${s.size}: ${s.stock}`).join(", ")
                    ) : (
                      <span className="text-gray-400">No sizes</span>
                    )}
                  </td>
                  <td className="p-2 border">{new Date(product.created_at).toLocaleString()}</td>
                  <td className="p-2 border">
                    <button className="mr-2 text-blue-600 underline" onClick={() => startEdit(product)}>Edit</button>
                    <button className="text-red-600 underline" onClick={() => handleDeleteProduct(product.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editProduct && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <form onSubmit={handleEditProduct} className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Product</h2>
            <div className="mb-2">
              <input
                type="text"
                placeholder="Product Name"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div className="mb-2">
              <textarea
                placeholder="Description"
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="mb-2">
              <input
                type="number"
                placeholder="Price"
                value={editForm.price}
                onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div className="mb-2">
              <label className="block mb-1 font-medium">Product Images (up to 3)</label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer bg-gray-100 border border-gray-300 px-4 py-2 rounded hover:bg-gray-200 transition font-medium">
                  <input type="file" accept="image/*" multiple onChange={handleEditImageChange} className="hidden" />
                  Choose Images
                </label>
                <span className="text-xs text-gray-500">or drag & drop</span>
              </div>
              {editImageUploadError && <div className="text-red-600 text-sm mt-1">{editImageUploadError}</div>}
              <div className="flex gap-2 mt-2">
                {editImages.map((img, idx) => {
                  const imageUrl = img.url;
                  let isValidWebUrl = false;
                  if (typeof imageUrl === 'string' && imageUrl.length > 0) {
                    try {
                      new URL(imageUrl); // Attempt to construct URL to validate
                      isValidWebUrl = true; // If no error, it's a valid structure
                    } catch (e) {
                      // Invalid URL structure, or could be a blob URL which is fine
                      if (imageUrl.startsWith('blob:')) {
                        isValidWebUrl = true;
                      } else {
                        isValidWebUrl = false;
                        console.warn(`Invalid URL for edit preview at index ${idx}: ${imageUrl}`, e);
                      }
                    }
                  } else {
                     isValidWebUrl = false; // Explicitly false for non-string or empty imageUrl
                  }

                  if (isValidWebUrl) {
                    return (
                      <div key={idx} className="relative w-24 h-24 bg-gray-200 rounded overflow-hidden flex items-center justify-center group">
                        <Image
                          src={imageUrl}
                          alt={`edit-preview-${idx}`}
                          width={96}
                          height={96}
                          className="object-cover w-full h-full"
                          unoptimized={true}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveEditImage(idx)}
                          className="absolute top-1 right-1 bg-black bg-opacity-60 text-white rounded-full w-6 h-6 flex items-center justify-center p-0.5 opacity-80 hover:opacity-100 transition"
                          title="Remove image"
                          style={{ lineHeight: 1, fontSize: '1.25rem', fontWeight: 700 }}
                        >
                          <span className="flex items-center justify-center w-full h-full">&times;</span>
                        </button>
                      </div>
                    );
                  } else {
                    return (
                        <div key={idx} className="relative w-24 h-24 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-500 p-1 text-center">
                            Preview unavailable
                        </div>
                    );
                  }
                })}
              </div>
            </div>
            <div className="mb-2">
              <label className="block mb-1 font-medium">Sizes & Stock</label>
              <div className="grid grid-cols-2 gap-2">
                {editSizes.map((s, idx) => (
                  <div key={s.size} className="flex items-center gap-2">
                    <span className="w-10">{s.size}</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Stock"
                      value={s.stock}
                      onChange={e => handleEditSizeStockChange(idx, e.target.value)}
                      className="border rounded px-2 py-1 w-20"
                    />
                  </div>
                ))}
              </div>
            </div>
            {editError && <div className="text-red-600 text-sm mb-2">{editError}</div>}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                className="bg-gray-300 text-black px-4 py-2 rounded"
                onClick={() => setEditProduct(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-60"
                disabled={editLoading}
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
