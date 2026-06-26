import { useState, useEffect } from 'react';
import { ArrowLeft, ClipboardCheck, CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API } from '../api';

const DEFAULT_ITEMS = [
  "Measure room dimensions before cutting",
  "Check subfloor is clean, dry and level",
  "Fit gripper rods around perimeter",
  "Lay underlay with seams taped",
  "Install carpet with power stretcher",
  "Trim excess and tuck edges",
  "Clean and vacuum finished room",
  "Walkthrough with customer",
  "Collect payment / get signature",
  "Schedule review request in 2 weeks"
];

export default function ChecklistPage() {
  const navigate = useNavigate();
  const [checklists, setChecklists] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedItems, setSelectedItems] = useState(DEFAULT_ITEMS);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [cRes, clRes] = await Promise.all([
        API.getCustomers(),
        fetch('/api/checklists').then(r=>r.json())
      ]);
      setCustomers(cRes);
      setChecklists(clRes);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function createChecklist(e) {
    e.preventDefault();
    await fetch('/api/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: parseInt(selectedCustomer),
        items: selectedItems
      })
    });
    setShowForm(false);
    setSelectedCustomer('');
    setSelectedItems(DEFAULT_ITEMS);
    loadData();
  }

  async function toggleItem(checklistId, completedCount, totalCount, direction) {
    const newCount = direction === 'inc' ? completedCount + 1 : Math.max(0, completedCount - 1);
    await fetch(`/api/checklists/${checklistId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_count: newCount, total_count: totalCount })
    });
    loadData();
  }

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/40 text-sm mb-1">Installation Quality</p>
          <h1 className="text-3xl font-bold">Job Checklists</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary px-5 py-2.5 flex items-center gap-2 text-sm">
          <ClipboardCheck className="w-4 h-4" />
          New Checklist
        </button>
      </div>

      {showForm && (
        <form onSubmit={createChecklist} className="card glass p-6 mb-6 max-w-2xl">
          <h3 className="font-semibold mb-4">Create Job Checklist</h3>
          <div className="mb-4">
            <label className="text-sm text-white/40 mb-1 block">Customer</label>
            <select value={selectedCustomer} onChange={e=> setSelectedCustomer(e.target.value)} required>
              <option value="">Select customer...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="text-sm text-white/40 mb-2 block">Tasks ({selectedItems.length})</label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {selectedItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <input type="text" value={item} onChange={e=> {
                    const newItems = [...selectedItems];
                    newItems[i] = e.target.value;
                    setSelectedItems(newItems);
                  }} className="flex-1 text-sm py-2"
                  />
                  <button type="button" onClick={() => setSelectedItems(selectedItems.filter((_, idx) => idx !== i))}
                    className="text-red-400 text-xs hover:text-red-300">Remove</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setSelectedItems([...selectedItems, ''])}
              className="text-xs text-amber-400 mt-2 hover:underline"
            >+ Add task</button>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary px-6 py-2 text-sm">Create Checklist</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {checklists.length === 0 ? (
          <div className="card glass p-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 mb-2">No job checklists yet</p>
            <p className="text-sm text-white/20">Create a checklist for each installation to track quality</p>
          </div>
        ) : (
          checklists.map(cl => {
            const items = JSON.parse(cl.items || '[]');
            const pct = cl.total_count > 0 ? (cl.completed_count / cl.total_count * 100) : 0;
            return (
              <div key={cl.id} className="card glass p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      cl.status === 'complete' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
                    }`}>
                      <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{cl.customer_name}</p>
                      <p className="text-xs text-white/40">Fitter: {cl.fitter_name || 'Not assigned'} · {cl.scheduled_date || 'No date'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{cl.completed_count}/{cl.total_count}</p>
                      <p className="text-xs text-white/40">{pct.toFixed(0)}% complete</p>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      cl.status === 'complete' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
                    }`}>
                      {cl.status === 'complete' ? 'Complete' : 'In Progress'}
                    </span>
                  </div>
                </div>

                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>

                <div className="space-y-2">
                  {items.map((item, i) => {
                    const isDone = i < cl.completed_count;
                    return (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02]">
                        <button onClick={() => toggleItem(cl.id, cl.completed_count, cl.total_count, isDone ? 'dec' : 'inc')}
                          className="shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-white/20" />
                          )}
                        </button>
                        <span className={`text-sm ${isDone ? 'text-white/40 line-through' : 'text-white/80'}`}>{item}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
