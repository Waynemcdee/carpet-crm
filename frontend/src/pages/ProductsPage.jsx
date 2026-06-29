import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Package, Search, X, Upload, Image as ImageIcon, Grid3X3 } from 'lucide-react';
import { API } from '../api';

const CATEGORIES = ['Carpet', 'Vinyl', 'Laminate', 'LVT', 'Underlay', 'Accessories'];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', category: 'Carpet', price_per_sqm: '', cost_per_sqm: '', stock: '', description: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [textureFile, setTextureFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [texturePreview, setTexturePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef();
  const textureInputRef = useRef();

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    try { const data = await API.getProducts(); setProducts(data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: '', category: 'Carpet', price_per_sqm: '', cost_per_sqm: '', stock: '', description: '' });
    setImageFile(null); setTextureFile(null);
    setImagePreview(''); setTexturePreview('');
    setShowForm(true);
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      name: product.name || '',
      category: product.category || 'Carpet',
      price_per_sqm: product.price_per_sqm || '',
      cost_per_sqm: product.cost_per_sqm || '',
      stock: product.stock || '',
      description: product.description || ''
    });
    setImageFile(null); setTextureFile(null);
    setImagePreview(product.image || '');
    setTexturePreview(product.texture_image || '');
    setShowForm(true);
  }

  function handleImageChange(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (type === 'image') { setImageFile(file); setImagePreview(ev.target.result); }
      else { setTextureFile(file); setTexturePreview(ev.target.result); }
    };
    reader.readAsDataURL(file);
  }

  async function uploadFile(file) {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    return data.url;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const imageUrl = imageFile ? await uploadFile(imageFile) : (editing?.image || '');
      const textureUrl = textureFile ? await uploadFile(textureFile) : (editing?.texture_image || '');
      const payload = {
        ...form,
        price_per_sqm: parseFloat(form.price_per_sqm) || 0,
        cost_per_sqm: parseFloat(form.cost_per_sqm) || 0,
        stock: parseInt(form.stock) || 0,
        image: imageUrl,
        texture_image: textureUrl
      };
      if (editing) {
        await API.updateProduct(editing.id, payload);
      } else {
        await API.createProduct(payload);
      }
      setShowForm(false);
      loadProducts();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Deactivate this product? It will be hidden from quotes and the visualiser.')) return;
    try { await API.deleteProduct(id); loadProducts(); }
    catch (e) { alert('Failed: ' + e.message); }
  }

  const filtered = products.filter(p =>
    !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/40 text-sm mb-1">Manage your flooring range</p>
          <h1 className="text-3xl font-bold">Products</h1>
        </div>
        <button onClick={openAdd} className="btn-primary px-5 py-2.5 flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-10" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="shimmer h-64 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card glass p-12 text-center">
          <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40 mb-2">No products found</p>
          <p className="text-sm text-white/20">{search ? 'Try a different search' : 'Add your first product to get started'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="card glass overflow-hidden group">
              <div className="relative aspect-square bg-white/5">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Grid3X3 className="w-10 h-10 text-white/20" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(p)} className="p-1.5 bg-black/60 rounded-lg hover:bg-black/80 text-white">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-black/60 rounded-lg hover:bg-red-500/80 text-white">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {p.texture_image && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-[10px] text-white/80 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Texture
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold truncate">{p.name}</p>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{p.category}</span>
                </div>
                <p className="text-sm text-white/40 mb-2">£{p.price_per_sqm?.toFixed(2)}/m² · Stock: {p.stock}</p>
                <p className="text-xs text-white/30 line-clamp-2">{p.description || 'No description'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card glass w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
              <h2 className="text-xl font-bold">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/40 mb-1 block">Name *</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full" placeholder="e.g. Karndean Baltic Oak" />
                </div>
                <div>
                  <label className="text-sm text-white/40 mb-1 block">Category *</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-white/40 mb-1 block">Price / m² (£)</label>
                  <input type="number" step="0.01" value={form.price_per_sqm} onChange={e => setForm({...form, price_per_sqm: e.target.value})} className="w-full" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm text-white/40 mb-1 block">Cost / m² (£)</label>
                  <input type="number" step="0.01" value={form.cost_per_sqm} onChange={e => setForm({...form, cost_per_sqm: e.target.value})} className="w-full" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm text-white/40 mb-1 block">Stock</label>
                  <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="w-full" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-sm text-white/40 mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full" placeholder="Product details, specs, suitability..." />
              </div>

              {/* Image Uploads */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/40 mb-1 block">Product Photo</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-white/40 transition-colors">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-white/30 mb-1" />
                        <span className="text-xs text-white/40">Click to upload</span>
                      </>
                    )}
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e, 'image')} />
                  </label>
                  <p className="text-[10px] text-white/30 mt-1">Shown in product lists and quotes</p>
                </div>
                <div>
                  <label className="text-sm text-white/40 mb-1 block">Texture Image (Visualiser)</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-white/40 transition-colors">
                    {texturePreview ? (
                      <img src={texturePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <>
                        <ImageIcon className="w-6 h-6 text-white/30 mb-1" />
                        <span className="text-xs text-white/40">Click to upload</span>
                      </>
                    )}
                    <input ref={textureInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e, 'texture')} />
                  </label>
                  <p className="text-[10px] text-white/30 mt-1">Seamless tile for room visualiser overlay</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary px-6 py-2 text-sm">
                  {saving ? 'Saving...' : (editing ? 'Update Product' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
