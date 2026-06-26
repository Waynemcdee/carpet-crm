import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, CalendarPlus, MessageCircle, TrendingUp, Target } from 'lucide-react';
import { API, getInitials } from '../api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try { const res = await API.getDashboard(); setData(res); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="shimmer h-10 w-64 rounded-lg mb-8"></div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="shimmer h-28 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const hotLeads = data?.hot_leads || [];

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/40 text-sm mb-1">Good morning, John</p>
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <button onClick={() => navigate('/analytics')} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.06] text-sm font-medium transition-colors">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          View Analytics
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card glass p-5">
          <p className="text-white/40 text-sm mb-2">This Month</p>
          <p className="text-3xl font-bold text-emerald-400">£{stats.month_value?.toLocaleString() || 0}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min((stats.month_value || 0) / 30000 * 100, 100)}%` }} />
            </div>
            <span className="text-[10px] text-white/30">Target: £30k</span>
          </div>
        </div>

        <div className="card glass p-5">
          <p className="text-white/40 text-sm mb-2">Open Quotes</p>
          <p className="text-3xl font-bold text-amber-400">{stats.quotes || 0}</p>
          <p className="text-xs text-white/30 mt-2">£{stats.open_quotes_value?.toLocaleString() || 0} potential</p>
        </div>

        <div className="card glass p-5">
          <p className="text-white/40 text-sm mb-2">Jobs In Progress</p>
          <p className="text-3xl font-bold text-blue-400">{stats.jobs_in_progress || 0}</p>
          <p className="text-xs text-white/30 mt-2">{stats.upcoming_appointments || 0} appointments</p>
        </div>

        <div className="card glass p-5">
          <p className="text-white/40 text-sm mb-2">Conversion Rate</p>
          <p className="text-3xl font-bold text-violet-400">{stats.conversion_rate || 0}%</p>
          <p className="text-xs text-white/30 mt-2">{stats.customers || 0} total leads</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Hot Leads */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">🔥 Hot Leads</h2>
            <button onClick={() => navigate('/customers')} className="text-sm text-amber-400 font-medium hover:underline">View All →</button>
          </div>

          <div className="space-y-2">
            {hotLeads.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-8">No hot leads right now. Time to make some calls!</p>
            ) : (
              hotLeads.map(c => (
                <div key={c.id} className="card glass p-4 cursor-pointer hover:bg-white/[0.03] transition-colors flex items-center gap-4"
                  onClick={() => navigate(`/customers/${c.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center text-sm font-bold text-amber-400 shrink-0">
                    {getInitials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{c.name}</p>
                      <span className="status-badge status-hot text-[10px]">HOT</span>
                    </div>
                    <p className="text-xs text-white/40">{c.phone} · {c.notes || 'No notes'}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {c.quote_count > 0 && (
                      <span className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-1 rounded-full">{c.quote_count} quote{c.quote_count > 1 ? 's' : ''}</span>
                    )}
                    {c.sample_count > 0 && (
                      <span className="text-[10px] bg-blue-400/10 text-blue-400 px-2 py-1 rounded-full">{c.sample_count} sample{c.sample_count > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { icon: Plus, label: 'Add Customer', color: 'text-amber-400', path: '/customers' },
              { icon: Package, label: 'Sample Follow-ups', color: 'text-blue-400', path: '/samples', badge: stats.samples_needing_followup },
              { icon: CalendarPlus, label: 'Book Measure', color: 'text-emerald-400', path: '/calendar' },
              { icon: MessageCircle, label: 'Reactivate Old', color: 'text-purple-400', path: '/reactivation' },
            ].map((action, i) => (
              <button key={i} onClick={() => navigate(action.path)}
                className="w-full card glass p-4 flex items-center gap-4 hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${action.color}`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="font-medium flex-1">{action.label}</span>
                {action.badge > 0 && (
                  <span className="bg-blue-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">{action.badge}</span>
                )}
              </button>
            ))}
          </div>

          <div className="card glass p-5 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold">Monthly Target</h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">£{stats.month_value?.toLocaleString() || 0}</p>
            <p className="text-sm text-white/40 mb-3">of £30,000 goal</p>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" style={{ width: `${Math.min((stats.month_value || 0) / 30000 * 100, 100)}%` }} />
            </div>
            <p className="text-xs text-white/30 mt-2">{Math.round((stats.month_value || 0) / 30000 * 100)}% complete · {Math.max(30000 - (stats.month_value || 0), 0).toLocaleString()} to go</p>
          </div>
        </div>
      </div>
    </div>
  );
}
