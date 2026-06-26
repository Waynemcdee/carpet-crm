import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Phone, MapPin, Wrench } from 'lucide-react';
import { API, formatDate } from '../api';

export default function CalendarPage() {
  const [appointments, setAppointments] = useState([]);
  const [fitters, setFitters] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'

  const [formData, setFormData] = useState({
    customer_id: '',
    type: 'measure',
    fitter_name: '',
    fitter_phone: '',
    scheduled_date: '',
    duration_minutes: 120,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [currentDate, viewMode]);

  async function loadData() {
    setLoading(true);
    try {
      const start = new Date(currentDate);
      start.setDate(1);
      const end = new Date(currentDate);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);

      const [appts, fittersList, customersList] = await Promise.all([
        API.getCalendar(start.toISOString().split('T')[0], end.toISOString().split('T')[0]),
        API.getFitters(),
        API.getCustomers()
      ]);

      setAppointments(appts);
      setFitters(fittersList);
      setCustomers(customersList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      customer_id: '',
      type: 'measure',
      fitter_name: '',
      fitter_phone: '',
      scheduled_date: '',
      duration_minutes: 120,
      notes: ''
    });
    setEditingId(null);
  }

  function openNewForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(appt) {
    setFormData({
      customer_id: appt.customer_id,
      type: appt.type,
      fitter_name: appt.fitter_name || '',
      fitter_phone: appt.fitter_phone || '',
      scheduled_date: appt.scheduled_date?.slice(0, 16) || '',
      duration_minutes: appt.duration_minutes || 120,
      notes: appt.notes || ''
    });
    setEditingId(appt.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await API.updateAppointment(editingId, formData);
      } else {
        await API.createAppointment(formData);
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this appointment?')) return;
    try {
      await API.deleteAppointment(id);
      loadData();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  async function handleComplete(id) {
    try {
      await API.completeAppointment(id);
      loadData();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  function handleFitterSelect(name) {
    const fitter = fitters.find(f => f.name === name);
    setFormData(prev => ({
      ...prev,
      fitter_name: name,
      fitter_phone: fitter?.phone || ''
    }));
  }

  // Generate calendar days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const calendarDays = [];
  for (let i = 0; i < startDayOfWeek; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function getAppointmentsForDay(day) {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter(a => a.scheduled_date?.startsWith(dateStr));
  }

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Showroom Calendar</h1>
        <button onClick={openNewForm} className="btn-primary flex items-center gap-2 px-4 py-2">
          <Plus className="w-4 h-4" /> Add Appointment
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-white/5 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">{monthNames[month]} {year}</h2>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-white/5 rounded-lg">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-medium text-white/40 py-2">{d}</div>
        ))}
        {calendarDays.map((day, i) => {
          const dayAppts = getAppointmentsForDay(day);
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
          return (
            <div key={i} className={`min-h-[100px] p-2 rounded-lg border border-white/5 ${
              day ? 'bg-surface hover:bg-white/5' : ''
            } ${isToday ? 'border-amber-400/30' : ''}`}>
              {day && (
                <>
                  <span className={`text-sm font-medium ${isToday ? 'text-amber-400' : 'text-white/60'}`}>{day}</span>
                  <div className="mt-1 space-y-1">
                    {dayAppts.slice(0, 3).map(a => (
                      <button
                        key={a.id}
                        onClick={() => openEditForm(a)}
                        className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate ${
                          a.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          a.type === 'measure' ? 'bg-blue-500/20 text-blue-400' :
                          a.type === 'fit' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}
                      >
                        {a.type === 'measure' ? 'M' : a.type === 'fit' ? 'F' : 'V'} {a.customer_name?.split(' ')[0]}
                      </button>
                    ))}
                    {dayAppts.length > 3 && (
                      <span className="text-[10px] text-white/30">+{dayAppts.length - 3} more</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6 text-xs text-white/40">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Measure</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Fit</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Visit</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Completed</span>
      </div>

      {/* Appointment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{editingId ? 'Edit Appointment' : 'New Appointment'}</h2>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1 hover:bg-white/5 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/50 mb-1">Customer</label>
                  <select
                    value={formData.customer_id}
                    onChange={e => setFormData({...formData, customer_id: parseInt(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    required
                  >
                    <option value="">Select customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-white/50 mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    >
                      <option value="measure">Measure</option>
                      <option value="fit">Fit</option>
                      <option value="visit">Visit</option>
                      <option value="callback">Callback</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-white/50 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      min="15"
                      step="15"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_date}
                    onChange={e => setFormData({...formData, scheduled_date: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">Fitter</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.fitter_name}
                      onChange={e => handleFitterSelect(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    >
                      <option value="">Select fitter...</option>
                      {fitters.map(f => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                      <option value="__custom__">+ Add custom</option>
                    </select>
                    {formData.fitter_name === '__custom__' && (
                      <input
                        type="text"
                        placeholder="Fitter name"
                        value={formData.fitter_name === '__custom__' ? '' : formData.fitter_name}
                        onChange={e => setFormData({...formData, fitter_name: e.target.value})}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">Fitter Phone</label>
                  <input
                    type="tel"
                    value={formData.fitter_phone}
                    onChange={e => setFormData({...formData, fitter_phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    placeholder="07700 900000"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm min-h-[80px]"
                    placeholder="Access details, parking, special instructions..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingId)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary py-2.5 text-sm font-medium">
                    {editingId ? 'Update' : 'Book'} Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}