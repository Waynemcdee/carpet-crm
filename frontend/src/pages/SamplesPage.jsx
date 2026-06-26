import { useState, useEffect } from 'react';
import { Send, Phone, User, Package, CheckCircle, XCircle, Clock, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { API } from '../api';

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-amber-400/10 text-amber-400' },
  converted: { label: 'Converted', color: 'bg-emerald-400/10 text-emerald-400' },
  declined: { label: 'Declined', color: 'bg-red-400/10 text-red-400' },
  returned: { label: 'Returned', color: 'bg-white/10 text-white/40' },
};

export default function SamplesPage() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await fetch('/api/samples').then(r => r.json());
      setSamples(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleSend(id, stage) {
    const message = prompt(`Follow-up ${stage} message:`);
    if (!message) return;
    try {
      await API.sendFollowUp(id, message, stage);
      alert(`Follow-up ${stage} sent`);
      loadData();
    } catch (e) { alert('Failed: ' + e.message); }
  }

  async function updateSampleStatus(id, status) {
    await fetch(`/api/samples/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadData();
  }

  const getSampleStatus = (s) => {
    if (s.converted) return 'converted';
    if (s.returned) return 'declined';
    return 'active';
  };

  const filtered = filter === 'all' ? samples : samples.filter(s => getSampleStatus(s) === filter);

  if (loading) {
    return (
      <div className="p-8 max-w-[1400px]">
        <div className="shimmer h-8 w-40 rounded-lg mb-4"></div>
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="shimmer h-24 rounded-2xl"></div>)}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/40 text-sm mb-1">Sample Management</p>
          <h1 className="text-3xl font-bold">Sample Follow-ups</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {cfg.label} ({samples.filter(s => getSampleStatus(s) === key).length})
          </button>
        ))}
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filter === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >All ({samples.length})</button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card glass p-12 text-center">
            <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 mb-2">No samples in this category</p>
          </div>
        ) : (
          filtered.map(s => {
            const status = getSampleStatus(s);
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
            const isExpanded = expandedId === s.id;
            return (
              <div key={s.id} className="card glass p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {s.product_image && (
                      <img src={s.product_image} className="w-12 h-12 rounded-lg object-cover" alt="" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{s.customer_name}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-white/40">{s.product_name}</p>
                      {s.customer_phone && (
                        <div className="flex items-center gap-1 text-xs text-white/30 mt-0.5">
                          <Phone className="w-3 h-3" /> {s.customer_phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === 'active' && (
                      <>
                        {!s.follow_up_1_sent && (
                          <button onClick={() => handleSend(s.id, 1)} className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1">
                            <Send className="w-3 h-3" /> Follow-up 1
                          </button>
                        )}
                        {s.follow_up_1_sent && !s.follow_up_2_sent && (
                          <button onClick={() => handleSend(s.id, 2)} className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1">
                            <Send className="w-3 h-3" /> Follow-up 2
                          </button>
                        )}
                        {s.follow_up_2_sent && (
                          <>
                            <button onClick={() => updateSampleStatus(s.id, 'converted')} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Converted
                            </button>
                            <button onClick={() => updateSampleStatus(s.id, 'declined')} className="px-3 py-1.5 text-xs rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Declined
                            </button>
                          </>
                        )}
                      </>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : s.id)} className="p-1.5 text-white/30 hover:text-white">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <p className="text-white/30 text-xs uppercase tracking-wide">Follow-ups</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${s.follow_up_1_sent ? 'bg-emerald-400' : 'bg-white/20'}`} />
                          <span className={s.follow_up_1_sent ? 'text-white/60' : 'text-white/30'}>Follow-up 1 {s.follow_up_1_sent ? 'sent' : 'pending'}</span>
                          {s.follow_up_1_date && <span className="text-xs text-white/20">{new Date(s.follow_up_1_date).toLocaleDateString('en-GB')}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${s.follow_up_2_sent ? 'bg-emerald-400' : 'bg-white/20'}`} />
                          <span className={s.follow_up_2_sent ? 'text-white/60' : 'text-white/30'}>Follow-up 2 {s.follow_up_2_sent ? 'sent' : 'pending'}</span>
                          {s.follow_up_2_date && <span className="text-xs text-white/20">{new Date(s.follow_up_2_date).toLocaleDateString('en-GB')}</span>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/30 text-xs uppercase tracking-wide">Actions</p>
                        <div className="flex flex-wrap gap-2">
                          {status === 'active' && (
                            <>
                              {!s.follow_up_1_sent && <span className="text-xs text-amber-400">Send Follow-up 1 to unlock Follow-up 2</span>}
                              {s.follow_up_1_sent && !s.follow_up_2_sent && <span className="text-xs text-amber-400">Send Follow-up 2 to unlock outcome buttons</span>}
                              {s.follow_up_2_sent && <span className="text-xs text-emerald-400">Both follow-ups sent — mark outcome</span>}
                            </>
                          )}
                          {status === 'converted' && <span className="text-xs text-emerald-400">Customer converted to order</span>}
                          {status === 'declined' && <span className="text-xs text-red-400">Customer declined</span>}
                          {status === 'returned' && <span className="text-xs text-white/30">Sample returned</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
