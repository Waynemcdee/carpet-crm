import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { API } from '../api';

export default function ReactivationPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOpportunities();
  }, []);

  async function loadOpportunities() {
    try {
      const res = await API.getReactivationOpps();
      setCustomers(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(customer) {
    const message = `Hi ${customer.name}, it's been a while since your last flooring purchase. Carpets and floors benefit from a refresh every few years — we'd love to help you find something new. Reply or call us to book a free consultation!`;
    const confirmed = window.confirm(`Send reactivation message?\n\n${message}`);
    if (!confirmed) return;
    try {
      await API.sendReactivation(customer.id, message);
      alert('Reactivation sent');
      loadOpportunities();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  if (loading) {
    return (
      <div className="px-5 pt-6 pb-4">
        <div className="shimmer h-8 w-48 rounded-lg mb-4"></div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="shimmer h-24 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-4">Reactivation</h1>
      <p className="text-sm text-white/40 mb-4">Customers with past purchases who may be ready for a refresh.</p>

      <div className="space-y-3">
        {customers.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No reactivation opportunities right now.</p>
        ) : (
          customers.map(c => (
            <div key={c.id} className="card glass p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">{c.name}</p>
                <span className="text-xs text-white/30">{c.phone}</span>
              </div>
              <div className="text-xs text-white/40 mb-3 space-y-1">
                <p>Last purchase: {c.last_purchase ? new Date(c.last_purchase).toLocaleDateString('en-GB') : 'Unknown'}</p>
                <p>Product: {c.last_product || 'Unknown'}</p>
                <p>Value: £{c.last_value?.toFixed(2) || 0}</p>
              </div>
              <button onClick={() => handleSend(c)} className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1">
                <MessageCircle className="w-3 h-3" /> Send Reactivation
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
