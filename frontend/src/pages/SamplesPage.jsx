import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { API, formatDate } from '../api';

export default function SamplesPage() {
  const [pending, setPending] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await API.getPendingFollowups();
      const pendingItems = res.filter(s => !s.follow_up_2_sent || (s.follow_up_1_sent && !s.follow_up_2_sent));
      const sentItems = res.filter(s => s.follow_up_1_sent && s.follow_up_2_sent);
      setPending(pendingItems);
      setSent(sentItems);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(id, stage) {
    const message = prompt(`Follow-up ${stage} message:`);
    if (!message) return;
    try {
      await API.sendFollowUp(id, message, stage);
      alert(`Follow-up ${stage} sent`);
      loadData();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  if (loading) {
    return (
      <div className="px-5 pt-6 pb-4">
        <div className="shimmer h-8 w-40 rounded-lg mb-4"></div>
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="shimmer h-24 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-4">Sample Follow-ups</h1>

      <h2 className="text-sm font-semibold text-white/40 mb-2 uppercase tracking-wide">Pending</h2>
      <div className="space-y-3 mb-6">
        {pending.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No pending follow-ups</p>
        ) : (
          pending.map(s => (
            <div key={s.id} className="card glass p-4">
              <div className="flex items-center gap-3 mb-3">
                {s.product_image && <img src={s.product_image} className="w-12 h-12 rounded-lg object-cover" alt="" />}
                <div>
                  <p className="font-semibold">{s.customer_name}</p>
                  <p className="text-xs text-white/40">{s.phone}</p>
                </div>
              </div>
              <p className="text-sm text-white/60 mb-3">{s.product_name}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSend(s.id, 1)}
                  disabled={s.follow_up_1_sent}
                  className={`flex-1 py-2 text-xs rounded-xl flex items-center justify-center gap-1 ${s.follow_up_1_sent ? 'bg-white/5 text-white/20' : 'btn-primary'}`}
                >
                  <Send className="w-3 h-3" /> Follow-up 1
                </button>
                <button
                  onClick={() => handleSend(s.id, 2)}
                  disabled={!s.follow_up_1_sent || s.follow_up_2_sent}
                  className={`flex-1 py-2 text-xs rounded-xl flex items-center justify-center gap-1 ${!s.follow_up_1_sent || s.follow_up_2_sent ? 'bg-white/5 text-white/20' : 'btn-primary'}`}
                >
                  <Send className="w-3 h-3" /> Follow-up 2
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <h2 className="text-sm font-semibold text-white/40 mb-2 uppercase tracking-wide">Completed</h2>
      <div className="space-y-3">
        {sent.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No completed follow-ups yet</p>
        ) : (
          sent.map(s => (
            <div key={s.id} className="card glass p-4 opacity-60">
              <div className="flex items-center gap-3 mb-2">
                {s.product_image && <img src={s.product_image} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                <div>
                  <p className="font-semibold">{s.customer_name}</p>
                  <p className="text-xs text-white/40">{s.product_name}</p>
                </div>
              </div>
              <p className="text-xs text-white/30">Both follow-ups sent</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
