import { useState, useEffect } from 'react';
import { Star, Check } from 'lucide-react';
import { API, formatDate } from '../api';

export default function ReviewsPage() {
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    try {
      const res = await API.getPendingReviews();
      setPending(res.filter(r => !r.completed_at));
      setCompleted(res.filter(r => r.completed_at));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(id) {
    const ratingStr = prompt('Rating (1-5):');
    if (!ratingStr) return;
    const rating = parseInt(ratingStr, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      alert('Invalid rating');
      return;
    }
    try {
      await API.completeReview(id, rating);
      alert('Review marked complete');
      loadReviews();
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
      <h1 className="text-2xl font-bold mb-4">Reviews</h1>

      <h2 className="text-sm font-semibold text-white/40 mb-2 uppercase tracking-wide">Pending</h2>
      <div className="space-y-3 mb-6">
        {pending.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No pending reviews</p>
        ) : (
          pending.map(r => (
            <div key={r.id} className="card glass p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">{r.customer_name}</p>
                  <p className="text-xs text-white/40">{r.phone}</p>
                </div>
                <span className="status-badge status-lead">Pending</span>
              </div>
              <p className="text-xs text-white/40 mb-3">Requested: {formatDate(r.requested_at)}</p>
              <button onClick={() => handleComplete(r.id)} className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1">
                <Check className="w-3 h-3" /> Mark Reviewed
              </button>
            </div>
          ))
        )}
      </div>

      <h2 className="text-sm font-semibold text-white/40 mb-2 uppercase tracking-wide">Completed</h2>
      <div className="space-y-3">
        {completed.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No completed reviews yet</p>
        ) : (
          completed.map(r => (
            <div key={r.id} className="card glass p-4 opacity-60">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">{r.customer_name}</p>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-medium">{r.rating}</span>
                </div>
              </div>
              <p className="text-xs text-white/40">Completed: {formatDate(r.completed_at)}</p>
              {r.comment && <p className="text-xs text-white/40 mt-1">"{r.comment}"</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
