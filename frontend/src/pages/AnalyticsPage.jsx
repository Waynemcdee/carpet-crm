import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Target, DollarSign, Award, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API } from '../api';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await API.getAnalytics();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="text-white/40"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-2xl font-bold">Sales Analytics</h1>
        </div>
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="shimmer h-32 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const { funnel, top_products, by_source, fitters, weekly_trend } = data;

  const maxRevenue = weekly_trend.length > 0 ? Math.max(...weekly_trend.map(w => w.revenue), 1) : 1;

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-white/40"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold">Sales Analytics</h1>
      </div>

      {/* Conversion Funnel */}
      <div className="card glass p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold">Conversion Funnel</h2>
        </div>

        <div className="flex items-end gap-1 h-32 mb-2">
          {[
            { label: 'Quotes', value: funnel.total_quotes, color: 'bg-blue-400' },
            { label: 'Accepted', value: funnel.accepted, color: 'bg-emerald-400' },
            { label: 'Paid', value: funnel.paid, color: 'bg-amber-400' },
          ].map((bar, i) => {
            const maxH = funnel.total_quotes || 1;
            const height = Math.max((bar.value / maxH) * 100, 5);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold">{bar.value}</span>
                <div className={`w-full ${bar.color} rounded-t-lg`} style={{ height: `${height}%`, minHeight: '8px' }} />
                <span className="text-[10px] text-white/40">{bar.label}</span>
              </div>
            );
          })}
        </div>

        <div className="glass p-3 rounded-xl text-center">
          <p className="text-2xl font-bold text-amber-400">{funnel.conversion_rate}%</p>
          <p className="text-xs text-white/40">Conversion Rate</p>
        </div>
      </div>

      {/* Weekly Trend */}
      {weekly_trend.length > 0 && (
        <div className="card glass p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold">Weekly Revenue Trend</h2>
          </div>
          <div className="flex items-end gap-2 h-28 mb-2">
            {[...weekly_trend].reverse().map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-white/40">£{Math.round(w.revenue / 1000)}k</span>
                <div className="w-full bg-emerald-400/60 rounded-t-md" style={{ height: `${Math.max((w.revenue / maxRevenue) * 100, 3)}%` }} />
                <span className="text-[9px] text-white/30">{w.week?.split('-')?.[1] || w.week}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Products */}
      {top_products.length > 0 && (
        <div className="card glass p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold">Top Products</h2>
          </div>
          <div className="space-y-3">
            {top_products.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-amber-400">
                  #{i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-white/40">{p.quote_count} quotes</p>
                </div>
                <p className="font-semibold text-sm text-emerald-400">£{Math.round(p.revenue).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales by Source */}
      {by_source.length > 0 && (
        <div className="card glass p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold">Sales by Source</h2>
          </div>
          <div className="space-y-3">
            {by_source.map((s, i) => {
              const totalRev = by_source.reduce((sum, x) => sum + x.revenue, 0) || 1;
              const pct = (s.revenue / totalRev) * 100;
              return (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <p className="text-sm capitalize">{s.source}</p>
                    <p className="text-sm font-medium">£{Math.round(s.revenue).toLocaleString()}</p>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-white/30 mt-1">{pct.toFixed(0)}% · {s.quote_count} quotes</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fitter Performance */}
      {fitters.length > 0 && (
        <div className="card glass p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold">Fitter Performance</h2>
          </div>
          <div className="space-y-3">
            {fitters.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400/20 to-purple-600/20 flex items-center justify-center font-bold text-sm text-purple-400">
                  {f.fitter_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{f.fitter_name}</p>
                  <p className="text-xs text-white/40">{f.jobs} jobs</p>
                </div>
                <p className="font-semibold text-sm">£{Math.round(f.revenue || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
