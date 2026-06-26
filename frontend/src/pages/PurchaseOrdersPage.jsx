import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Phone, Package, CheckCircle, Clock, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API } from '../api';

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ supplier_name: '', supplier_phone: '', items: '', total_cost: '', notes: '' });

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    try { const res = await fetch('http://localhost:5004/api/purchase-orders').then(r=>r.json()); setOrders(res); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function createOrder(e) {
    e.preventDefault();
    await fetch('http://localhost:5004/api/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setShowForm(false);
    setForm({ supplier_name: '', supplier_phone: '', items: '', total_cost: '', notes: '' });
    loadOrders();
  }

  async function updateStatus(poId, status) {
    await fetch(`http://localhost:5004/api/purchase-orders/${poId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadOrders();
  }

  const statusIcons = {
    pending: Clock,
    ordered: Truck,
    delivered: CheckCircle
  };

  const statusColors = {
    pending: 'text-amber-400 bg-amber-400/10',
    ordered: 'text-blue-400 bg-blue-400/10',
    delivered: 'text-emerald-400 bg-emerald-400/10'
  };

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/40 text-sm mb-1">Supplier Management</p>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary px-5 py-2.5 flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      {showForm && (
        <form onSubmit={createOrder} className="card glass p-6 mb-6 max-w-2xl">
          <h3 className="font-semibold mb-4">Create Purchase Order</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-white/40 mb-1 block">Supplier Name</label>
              <input value={form.supplier_name} onChange={e=> setForm({...form, supplier_name: e.target.value})} placeholder="e.g. Carpetright Wholesale" required />
            </div>
            <div>
              <label className="text-sm text-white/40 mb-1 block">Supplier Phone</label>
              <input value={form.supplier_phone} onChange={e=> setForm({...form, supplier_phone: e.target.value})} placeholder="0141 555 0123" />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm text-white/40 mb-1 block">Items</label>
            <textarea value={form.items} onChange={e=> setForm({...form, items: e.target.value})} placeholder="Karndean Baltic Oak x 45m², Cloud 9 underlay x 45m²..." rows={3} required />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-white/40 mb-1 block">Total Cost (£)</label>
              <input type="number" step="0.01" value={form.total_cost} onChange={e=> setForm({...form, total_cost: e.target.value})} placeholder="450.00" required />
            </div>
            <div>
              <label className="text-sm text-white/40 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e=> setForm({...form, notes: e.target.value})} placeholder="Delivery instructions..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary px-6 py-2 text-sm">Create Order</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="card glass p-12 text-center">
            <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 mb-2">No purchase orders yet</p>
            <p className="text-sm text-white/20">Create your first order when a customer accepts a quote</p>
          </div>
        ) : (
          orders.map(o => {
            const StatusIcon = statusIcons[o.status] || Clock;
            return (
              <div key={o.id} className="card glass p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusColors[o.status]}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{o.supplier_name}</p>
                      <p className="text-xs text-white/40">{o.items?.substring(0, 80)}... · £{o.total_cost}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColors[o.status]}`}>
                      {o.status}
                    </span>
                    {o.status === 'pending' && (
                      <button onClick={() => updateStatus(o.id, 'ordered')} className="text-xs bg-blue-400 text-black px-3 py-1 rounded-full font-medium hover:bg-blue-300">Mark Ordered</button>
                    )}
                    {o.status === 'ordered' && (
                      <button onClick={() => updateStatus(o.id, 'delivered')} className="text-xs bg-emerald-400 text-black px-3 py-1 rounded-full font-medium hover:bg-emerald-300">Mark Delivered</button>
                    )}
                  </div>
                </div>
                {o.notes && <p className="text-xs text-white/30 mt-3">📝 {o.notes}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
