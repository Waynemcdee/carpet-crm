import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Upload, Filter, Search, Tag, Ruler, Palette, Shield, Droplets } from 'lucide-react';
import { API } from '../api';

export default function ShowroomPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'carpet',
    supplier: '',
    price_retail: '',
    price_trade: '',
    width_m: '4.0',
    roll_length_m: '30.0',
    pile_weight: '',
    backing: '',
    colour: '',
    pattern: '',
    durability_rating: '',
    stain_resistant: false,
    bleach_cleanable: false,
    suitable_for: '',
    notes: ''
  });

  const categories = ['carpet', 'luxury-vinyl', 'lvt', 'wilton', 'underlay', 'accessories'];

  useEffect(() => {
    loadItems();
  }, [filterCategory]);

  async function loadItems() {
    setLoading(true);
    try {
      const data = await API.getShowroomItems(filterCategory || undefined);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      category: 'carpet',
      supplier: '',
      price_retail: '',
      price_trade: '',
      width_m: '4.0',
      roll_length_m: '30.0',
      pile_weight: '',
      backing: '',
      colour: '',
      pattern: '',
      durability_rating: '',
      stain_resistant: false,
      bleach_cleanable: false,
      suitable_for: '',
      notes: ''
    });
    setPreviewImage(null);
    setEditingId(null);
  }

  function openNewForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(item) {
    setFormData({
      name: item.name,
      category: item.category,
      supplier: item.supplier || '',
      price_retail: item.price_retail || '',
      price_trade: item.price_trade || '',
      width_m: item.width_m?.toString() || '4.0',
      roll_length_m: item.roll_length_m?.toString() || '30.0',
      pile_weight: item.pile_weight || '',
      backing: item.backing || '',
      colour: item.colour || '',
      pattern: item.pattern || '',
      durability_rating: item.durability_rating || '',
      stain_resistant: !!item.stain_resistant,
      bleach_cleanable: !!item.bleach_cleanable,
      suitable_for: item.suitable_for || '',
      notes: item.notes || ''
    });
    setPreviewImage(item.image);
    setEditingId(item.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'stain_resistant' || key === 'bleach_cleanable') {
          submitData.append(key, formData[key] ? '1' : '0');
        } else {
          submitData.append(key, formData[key]);
        }
      });

      const imageFile = e.target.image?.files[0];
      if (imageFile) {
        submitData.append('image', imageFile);
      }

      if (editingId) {
        await API.updateShowroomItem(editingId, submitData);
      } else {
        await API.createShowroomItem(submitData);
      }
      setShowForm(false);
      resetForm();
      loadItems();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this item from the showroom?')) return;
    try {
      await API.deleteShowroomItem(id);
      loadItems();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  const filteredItems = items.filter(item =>
    !searchQuery ||
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.colour?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="px-5 pt-6 pb-4">
        <div className="shimmer h-8 w-40 rounded-lg mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="shimmer h-64 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Showroom</h1>
          <p className="text-sm text-white/40 mt-1">{items.length} items in stock</p>
        </div>
        <button onClick={openNewForm} className="btn-primary flex items-center gap-2 px-4 py-2">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search carpets, suppliers, colours..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No items found.</p>
          <p className="text-sm text-white/30 mt-1">Add your first carpet or sample to the showroom.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredItems.map(item => (
            <div key={item.id} className="card glass overflow-hidden group">
              <div className="relative aspect-square bg-white/5">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <Upload className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={() => openEditForm(item)}
                    className="p-1.5 bg-black/50 backdrop-blur rounded-lg text-white hover:bg-black/70"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 bg-black/50 backdrop-blur rounded-lg text-white hover:bg-red-500/80"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/50 backdrop-blur text-white/80 capitalize">
                    {item.category?.replace('-', ' ')}
                  </span>
                </div>
              </div>

              <div className="p-3">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                <p className="text-xs text-white/40">{item.supplier || 'No supplier'}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-amber-400">£{item.price_retail?.toFixed(2) || '0.00'}/m²</span>
                  <span className="text-[10px] text-white/30">{item.width_m}m wide</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {item.stain_resistant && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Stain Resist</span>
                  )}
                  {item.bleach_cleanable && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Bleach Clean</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-2xl my-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{editingId ? 'Edit Item' : 'Add Showroom Item'}</h2>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1 hover:bg-white/5 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-white/50 mb-1">Image</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        {previewImage ? (
                          <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-6 h-6 text-white/20" />
                        )}
                      </div>
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setPreviewImage(reader.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="flex-1 text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      placeholder="Cormar Primo Ultra"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>{c.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Supplier</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={e => setFormData({...formData, supplier: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      placeholder="Cormar Carpets"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Retail Price (£/m²)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price_retail}
                      onChange={e => setFormData({...formData, price_retail: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      placeholder="28.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Trade Price (£/m²)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price_trade}
                      onChange={e => setFormData({...formData, price_trade: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      placeholder="14.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Width (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.width_m}
                      onChange={e => setFormData({...formData, width_m: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      placeholder="4.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Roll Length (m)</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.roll_length_m}
                      onChange={e => setFormData({...formData, roll_length_m: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      placeholder="30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Pile Weight</label>
                    <input
                      type="text"
                      value={formData.pile_weight}
                      onChange={e => setFormData({...formData, pile_weight: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      placeholder="40oz"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Backing</label>
                    <input
                      type="text"
                      value={formData.backing}
                      onChange={e => setFormData({...formData, backing: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      placeholder="Action Bac"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Colour</label>
                    <input
                      type="text"
                      value={formData.colour}
                      onChange={e => setFormData({...formData, colour: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      placeholder="Beige"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Pattern</label>
                    <input
                      type="text"
                      value={formData.pattern}
                      onChange={e => setFormData({...formData, pattern: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      placeholder="Plain, Stripe, Herringbone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Durability Rating</label>
                    <select
                      value={formData.durability_rating}
                      onChange={e => setFormData({...formData, durability_rating: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="domestic-light">Domestic Light</option>
                      <option value="domestic-medium">Domestic Medium</option>
                      <option value="domestic-heavy">Domestic Heavy</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-white/50 mb-1">Suitable For</label>
                    <input
                      type="text"
                      value={formData.suitable_for}
                      onChange={e => setFormData({...formData, suitable_for: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      placeholder="Living room, stairs, bedroom"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.stain_resistant}
                      onChange={e => setFormData({...formData, stain_resistant: e.target.checked})}
                      className="w-4 h-4 rounded border-white/20"
                    />
                    <span className="text-sm text-white/60">Stain Resistant</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.bleach_cleanable}
                      onChange={e => setFormData({...formData, bleach_cleanable: e.target.checked})}
                      className="w-4 h-4 rounded border-white/20"
                    />
                    <span className="text-sm text-white/60">Bleach Cleanable</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm min-h-[80px]"
                    placeholder="Additional details, installation notes..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingId)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary py-2.5 text-sm font-medium">
                    {editingId ? 'Update' : 'Add'} Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}