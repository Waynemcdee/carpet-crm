import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Phone, Mail, X, User, Wrench } from 'lucide-react';
import { API } from '../api';

export default function FittersPage() {
  const [fitters, setFitters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  useEffect(() => {
    loadFitters();
  }, []);

  async function loadFitters() {
    setLoading(true);
    try {
      const data = await API.getFitters();
      setFitters(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({ name: '', phone: '', email: '', notes: '' });
    setEditingId(null);
  }

  function openNewForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(fitter) {
    setFormData({
      name: fitter.name,
      phone: fitter.phone || '',
      email: fitter.email || '',
      notes: fitter.notes || ''
    });
    setEditingId(fitter.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await API.updateFitter(editingId, formData);
      } else {
        await API.createFitter(formData);
      }
      setShowForm(false);
      resetForm();
      loadFitters();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this fitter? They will be removed from the active list.')) return;
    try {
      await API.deleteFitter(id);
      loadFitters();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  if (loading) {
    return (
      <div className="px-5 pt-6 pb-4">
        <div className="shimmer h-8 w-40 rounded-lg mb-4"></div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="shimmer h-24 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Fitters</h1>
          <p className="text-sm text-white/40 mt-1">{fitters.length} active fitters</p>
        </div>
        <button onClick={openNewForm} className="btn-primary flex items-center gap-2 px-4 py-2">
          <Plus className="w-4 h-4" /> Add Fitter
        </button>
      </div>

      {fitters.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No fitters added yet.</p>
          <p className="text-sm text-white/30 mt-1">Add your first fitter to assign them to appointments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {fitters.map(fitter => (
            <div key={fitter.id} className="card glass p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white">
                    {fitter.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{fitter.name}</p>
                    <p className="text-xs text-white/40">Fitter</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditForm(fitter)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(fitter.id)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {fitter.phone && (
                  <div className="flex items-center gap-2 text-white/50">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{fitter.phone}</span>
                  </div>
                )}
                {fitter.email && (
                  <div className="flex items-center gap-2 text-white/50">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{fitter.email}</span>
                  </div>
                )}
                {fitter.notes && (
                  <p className="text-xs text-white/30 mt-2">{fitter.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{editingId ? 'Edit Fitter' : 'Add Fitter'}</h2>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1 hover:bg-white/5 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/50 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    placeholder="John Smith"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    placeholder="07700 900000"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    placeholder="fitter@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm min-h-[80px]"
                    placeholder="Skills, availability, vehicle type..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary py-2.5 text-sm font-medium">
                    {editingId ? 'Update' : 'Add'} Fitter
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