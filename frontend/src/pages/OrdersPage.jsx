import { useState, useEffect } from 'react';
import { Plus, Package, CheckCircle, Clock, Truck, Wrench, FileText, CreditCard, AlertCircle, Search, ChevronRight, User } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API, formatDate } from '../api';

const STATUS_CONFIG = {
  confirmed:     { label: 'Confirmed',     color: 'text-amber-400 bg-amber-400/10', icon: CheckCircle, next: 'in_production' },
  in_production: { label: 'In Production', color: 'text-blue-400 bg-blue-400/10',    icon: Clock,       next: 'ready' },
  ready:         { label: 'Ready',         color: 'text-cyan-400 bg-cyan-400/10',    icon: Package,     next: 'scheduled' },
  scheduled:     { label: 'Scheduled',     color: 'text-violet-400 bg-violet-400/10',icon: Truck,       next: 'fitted' },
  fitted:        { label: 'Fitted',        color: 'text-emerald-400 bg-emerald-400/10',icon: Wrench,     next: 'invoiced' },
  invoiced:      { label: 'Invoiced',      color: 'text-orange-400 bg-orange-400/10',  icon: FileText,    next: 'paid' },
  paid:          { label: 'Paid',          color: 'text-emerald-400 bg-emerald-400/10',icon: CreditCard, next: null },
  cancelled:     { label: 'Cancelled',     color: 'text-red-400 bg-red-400/10',      icon: AlertCircle, next: null },
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({
    customer_id: '', quote_id: '', room_name: '', product_name: '', total: '',
    deposit_paid: '', balance_due: '', fitter_name: '', scheduled_date: '', notes: ''
  });

  useEffect(() => { loadData(); }, []);

  // Auto-open convert form if ?convert=quote_id is in URL
  useEffect(() => {
    const convertId = searchParams.get('convert');
    if (convertId) {
      const q = quotes.find(q => q.id === parseInt(convertId));
      if (q) {
        setForm({
          ...form,
          quote_id: q.id,
          room_name: q.room_name || '',
          product_name: q.product_name || '',
          total: q.total || '',
          balance_due: q.total || ''
        });
        setShowCreate(true);
      }
    }
  }, [searchParams, quotes]);

  async function loadData() {
    try {
      const [oRes, qRes] = await Promise.all([
        fetch('/api/orders').then(r => r.json()),
        API.getQuotes()
      ]);
      setOrders(oRes);
      setQuotes(qRes.filter(q => q.status === 'accepted'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function createOrder(e) {
    e.preventDefault();
    const selectedQuote = quotes.find(q => q.id === parseInt(form.quote_id));
    if (!selectedQuote) return;
    const payload = {
      ...form,
      customer_id: selectedQuote.customer_id,
      room_name: form.room_name || selectedQuote.room_name,
      product_name: form.product_name || selectedQuote.product_name,
      total: parseFloat(form.total) || selectedQuote.total,
      deposit_paid: parseFloat(form.deposit_paid) || 0,
      balance_due: parseFloat(form.balance_due) || (parseFloat(form.total) || selectedQuote.total),
    };
    await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    setShowCreate(false);
    setForm({ customer_id: '', quote_id: '', room_name: '', product_name: '', total: '', deposit_paid: '', balance_due: '', fitter_name: '', scheduled_date: '', notes: '' });
    loadData();
  }

  async function updateStatus(orderId, status) {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
    });
    loadData();
  }

  async function updateBalance(orderId, deposit, balance) {
    await fetch(`/api/orders/${orderId}/balance`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deposit_paid: deposit, balance_due: balance })
    });
    loadData();
  }

  const filtered = orders.filter(o => {
    const matchesSearch = !search || (o.customer_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {};
  orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/40 text-sm mb-1">Customer Jobs</p>
          <h1 className="text-3xl font-bold">Orders</h1>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary px-5 py-2.5 flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Convert Quote
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createOrder} className="card glass p-6 mb-6 max-w-3xl">
          <h3 className="font-semibold mb-4">Create Order from Accepted Quote</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-white/40 mb-1 block">Select Quote</label>
              <select value={form.quote_id} onChange={e => {
                const q = quotes.find(q => q.id === parseInt(e.target.value));
                setForm({ ...form, quote_id: e.target.value, room_name: q?.room_name || '', product_name: q?.product_name || '', total: q?.total || '' });
              }} required>
                <option value="">Choose accepted quote...</option>
                {quotes.map(q => (
                  <option key={q.id} value={q.id}>{q.customer_name} — {q.room_name} — £{q.total}</option>
                ))}
              </select>
              {quotes.length === 0 && <p className="text-xs text-red-400 mt-1">No accepted quotes. Accept a quote first.</p>}
            </div>
            <div>
              <label className="text-sm text-white/40 mb-1 block">Fitter</label>
              <input value={form.fitter_name} onChange={e => setForm({...form, fitter_name: e.target.value})} placeholder="Steve, Dave..." />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-white/40 mb-1 block">Total (£)</label>
              <input type="number" step="0.01" value={form.total} onChange={e => setForm({...form, total: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm text-white/40 mb-1 block">Deposit Paid (£)</label>
              <input type="number" step="0.01" value={form.deposit_paid} onChange={e => setForm({...form, deposit_paid: e.target.value})} placeholder="0" />
            </div>
            <div>
              <label className="text-sm text-white/40 mb-1 block">Balance Due (£)</label>
              <input type="number" step="0.01" value={form.balance_due} onChange={e => setForm({...form, balance_due: e.target.value})} placeholder={form.total} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-white/40 mb-1 block">Fit Date</label>
              <input type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-white/40 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Special instructions..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary px-6 py-2 text-sm">Create Order</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="pl-10" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-surface border border-white/[0.06] rounded-lg px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label} ({statusCounts[key] || 0})</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card glass p-12 text-center">
            <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 mb-2">No orders yet</p>
            <p className="text-sm text-white/20">Convert an accepted quote to create your first order</p>
          </div>
        ) : (
          filtered.map(o => {
            const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.confirmed;
            const StatusIcon = cfg.icon;
            const nextStatus = cfg.next;
            const depositPct = o.total > 0 ? ((o.deposit_paid || 0) / o.total * 100) : 0;
            const isPaid = o.status === 'paid';
            return (
              <div key={o.id} className="card glass p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.color}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{o.customer_name}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-white/40">{o.room_name} · {o.product_name} · £{parseFloat(o.total).toFixed(2)}</p>
                      {o.scheduled_date && <p className="text-xs text-white/30 mt-0.5">Fit: {o.scheduled_date} {o.fitter_name ? `· Fitter: ${o.fitter_name}` : ''}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {nextStatus && (
                      <button onClick={() => updateStatus(o.id, nextStatus)}
                        className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full font-medium transition-colors"
                      >
                        Mark {STATUS_CONFIG[nextStatus].label}
                      </button>
                    )}
                    {o.status !== 'cancelled' && o.status !== 'paid' && (
                      <button onClick={() => updateStatus(o.id, 'cancelled')}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1">Cancel</button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-white/30 text-xs">Deposit</p>
                        <p className="font-medium">£{parseFloat(o.deposit_paid || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-xs">Balance Due</p>
                        <p className={`font-medium ${(o.balance_due || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>£{parseFloat(o.balance_due || 0).toFixed(2)}</p>
                      </div>
                      <div className="w-24">
                        <p className="text-white/30 text-xs">Paid</p>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(depositPct, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isPaid && (
                        <>
                          <input type="number" step="0.01" placeholder="Add payment" className="w-28 text-xs py-1.5"
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const val = parseFloat(e.target.value) || 0;
                                const newDeposit = (parseFloat(o.deposit_paid) || 0) + val;
                                const newBalance = Math.max(0, (parseFloat(o.total) || 0) - newDeposit);
                                updateBalance(o.id, newDeposit, newBalance);
                                e.target.value = '';
                              }
                            }}
                          />
                          <button className="text-xs text-amber-400 hover:underline"
                            onClick={() => {
                              const total = parseFloat(o.total) || 0;
                              updateBalance(o.id, total, 0);
                              updateStatus(o.id, 'paid');
                            }}
                          >Mark Paid</button>
                        </>
                      )}
                      <button onClick={() => navigate(`/customers/${o.customer_id}`)} className="text-xs text-white/30 hover:text-white flex items-center gap-1">
                        <User className="w-3 h-3" /> Customer <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
