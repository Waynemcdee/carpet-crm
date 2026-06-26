import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { API } from '../api';

export default function Quotes() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotes();
  }, []);

  async function loadQuotes() {
    try {
      const res = await API.getQuotes();
      setQuotes(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="px-5 pt-6 pb-4">
        <div className="shimmer h-8 w-32 rounded-lg mb-4"></div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="shimmer h-24 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <button onClick={() => navigate('/customers')} className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Quote
        </button>
      </div>

      <div className="space-y-3">
        {quotes.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No quotes yet. Create one from a customer profile.</p>
        ) : (
          quotes.map(q => (
            <div key={q.id} className="card glass p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">{q.customer_name}</p>
                <span className={`status-badge ${q.status === 'accepted' ? 'status-accepted' : q.status === 'paid' ? 'status-accepted' : 'status-lead'}`}>
                  {q.status}
                </span>
              </div>
              <p className="text-sm text-white/60 mb-1">{q.room_name} · {q.product_name}</p>
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>Total: <span className="text-amber-400 font-semibold">£{q.total?.toFixed(2)}</span></span>
                <span>Margin: £{q.margin?.toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
