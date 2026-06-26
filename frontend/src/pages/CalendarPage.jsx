import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { API, formatDate } from '../api';

export default function CalendarPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalendar();
  }, []);

  async function loadCalendar() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await API.getCalendar(today, end);
      setAppointments(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(id) {
    try {
      await API.completeAppointment(id);
      alert('Appointment marked complete');
      loadCalendar();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  const grouped = appointments.reduce((acc, a) => {
    const date = a.scheduled_date?.split('T')[0] || 'Unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(a);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="px-5 pt-6 pb-4">
        <div className="shimmer h-8 w-40 rounded-lg mb-4"></div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="shimmer h-24 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-4">Calendar</h1>
      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-white/30 text-center py-4">No appointments in the next 7 days.</p>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="mb-5">
            <h2 className="text-sm font-semibold text-white/40 mb-2 uppercase tracking-wide">{date}</h2>
            <div className="space-y-2">
              {items.map(a => (
                <div key={a.id} className="card glass p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{a.customer_name}</p>
                    <span className={`status-badge ${a.status === 'completed' ? 'status-accepted' : 'status-lead'}`}>{a.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40 mb-3">
                    <span className="capitalize">{a.type}</span>
                    <span>·</span>
                    <span>{a.fitter_name || 'Unassigned'}</span>
                    <span>·</span>
                    <span>{formatDate(a.scheduled_date)}</span>
                  </div>
                  {a.status !== 'completed' && (
                    <button onClick={() => handleComplete(a.id)} className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" /> Complete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
