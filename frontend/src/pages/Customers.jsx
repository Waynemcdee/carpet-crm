import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { API, getInitials } from '../api';

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [search]);

  async function loadCustomers() {
    try {
      const res = await API.getCustomers(search);
      setCustomers(res);
    } catch (e) {
      console.error(e);
    }
  }

  async function submitCustomer(e) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.createCustomer({
        name: form.name.value,
        phone: form.phone.value,
        email: form.email.value,
        address: form.address.value,
        source: form.source.value,
        notes: form.notes.value
      });
      setShowAdd(false);
      form.reset();
      loadCustomers();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  }

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11"
        />
      </div>

      <div className="space-y-2">
        {customers.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No customers yet. Add your first one!</p>
        ) : (
          customers.map(c => (
            <div key={c.id} className="card glass p-4 cursor-pointer" onClick={() => navigate(`/customers/${c.id}`)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center font-bold text-sm">
                  {getInitials(c.name)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-white/40">{c.phone} · {c.source}</p>
                </div>
                <span className={`status-badge ${c.status === 'hot' ? 'status-hot' : c.status === 'accepted' ? 'status-accepted' : 'status-lead'}`}>
                  {c.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Customer Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50">
          <div className="modal-backdrop absolute inset-0" onClick={() => setShowAdd(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-5"></div>
            <h2 className="text-xl font-bold mb-4">New Customer</h2>
            <form className="space-y-3" onSubmit={submitCustomer}>
              <input name="name" placeholder="Full name *" required />
              <input name="phone" placeholder="Phone number *" required />
              <input name="email" placeholder="Email" />
              <input name="address" placeholder="Address" />
              <select name="source" defaultValue="walk-in">
                <option value="walk-in">Walk-in</option>
                <option value="referral">Referral</option>
                <option value="facebook">Facebook</option>
                <option value="website">Website</option>
                <option value="returning">Returning Customer</option>
              </select>
              <textarea name="notes" placeholder="Notes / What they're looking for..." rows="3" />
              <button type="submit" className="btn-primary w-full py-3 text-base">Save Customer</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
