import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check, Camera, CreditCard, Calendar as CalIcon, Clock, User, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { API } from '../api';

export default function ShowroomPage() {
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); // June 2026
  const [selectedDate, setSelectedDate] = useState(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    scheduled_date: '',
    scheduled_time: '10:00',
    duration_minutes: 60,
    notes: '',
    photos_created: false,
    balance_paid: false,
    amount_due: ''
  });

  useEffect(() => {
    loadCustomers();
    loadBookings();
  }, []);

  async function loadCustomers() {
    try {
      const data = await API.getCustomers();
      setCustomers(data.customers || data);
    } catch (e) { console.error(e); }
  }

  async function loadBookings() {
    setLoading(true);
    try {
      const start = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
      const end = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
      const data = await API.getCalendar(start, end);
      // Filter only showroom/visit type appointments
      const showroom = (data || []).filter(b => b.type === 'visit' || b.type === 'showroom');
      setBookings(showroom);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function formatDate(d) {
    return d.toISOString().split('T')[0];
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  }

  function getBookingsForDate(day) {
    const dateStr = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    return bookings.filter(b => b.scheduled_date?.startsWith(dateStr));
  }

  function openNewForm(date = null) {
    const today = date || new Date();
    const dateStr = formatDate(today);
    setFormData({
      customer_id: '',
      scheduled_date: dateStr,
      scheduled_time: '10:00',
      duration_minutes: 60,
      notes: '',
      photos_created: false,
      balance_paid: false,
      amount_due: ''
    });
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(booking) {
    const dt = booking.scheduled_date?.split('T') || ['', ''];
    setFormData({
      customer_id: booking.customer_id?.toString() || '',
      scheduled_date: dt[0],
      scheduled_time: dt[1]?.substring(0, 5) || '10:00',
      duration_minutes: booking.duration_minutes || 60,
      notes: booking.notes || '',
      photos_created: booking.photos_created || false,
      balance_paid: booking.balance_paid || false,
      amount_due: booking.amount_due?.toString() || ''
    });
    setEditingId(booking.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const customer = customers.find(c => c.id.toString() === formData.customer_id);
      const payload = {
        customer_id: parseInt(formData.customer_id),
        type: 'visit',
        scheduled_date: `${formData.scheduled_date}T${formData.scheduled_time}`,
        duration_minutes: parseInt(formData.duration_minutes) || 60,
        fitter_name: 'Showroom',
        notes: formData.notes,
        photos_created: formData.photos_created ? 1 : 0,
        balance_paid: formData.balance_paid ? 1 : 0,
        amount_due: formData.amount_due ? parseFloat(formData.amount_due) : null
      };

      if (editingId) {
        await API.updateAppointment(editingId, payload);
      } else {
        await API.createAppointment(payload);
      }
      setShowForm(false);
      loadBookings();
    } catch (err) {
      alert('Failed: ' + (err.message || 'Unknown error'));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this showroom booking?')) return;
    try {
      await API.deleteAppointment(id);
      loadBookings();
    } catch (e) { console.error(e); }
  }

  async function togglePhotos(id, current) {
    try {
      await API.updateAppointment(id, { photos_created: current ? 0 : 1 });
      loadBookings();
    } catch (e) { console.error(e); }
  }

  async function togglePaid(id, current) {
    try {
      await API.updateAppointment(id, { balance_paid: current ? 0 : 1 });
      loadBookings();
    } catch (e) { console.error(e); }
  }

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  return (
    <div className="px-5 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Showroom Calendar</h1>
          <p className="text-sm text-white/40 mt-1">Book customers in for visits, photos & payments</p>
        </div>
        <button onClick={() => openNewForm()} className="btn-primary flex items-center gap-2 px-4 py-2">
          <Plus className="w-4 h-4" /> Book Customer
        </button>
      </div>

      {/* Calendar */}
      <div className="card glass mb-6">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-white/40 py-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-white/5">
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square p-1" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayBookings = getBookingsForDate(day);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
            return (
              <div
                key={day}
                onClick={() => { setSelectedDate(day); }}
                className={`aspect-square p-1.5 border border-white/5 cursor-pointer transition-colors hover:bg-white/10 ${
                  isToday ? 'bg-amber-500/20 border-amber-500/30' : ''
                } ${selectedDate === day ? 'bg-white/15' : ''}`}
              >
                <div className={`text-sm font-medium mb-0.5 ${isToday ? 'text-amber-400' : ''}`}>{day}</div>
                {dayBookings.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {dayBookings.slice(0, 2).map((b, idx) => (
                      <div key={idx} className={`text-[9px] px-1 py-0.5 rounded truncate ${
                        b.photos_created && b.balance_paid ? 'bg-green-500/30 text-green-300' :
                        b.photos_created ? 'bg-blue-500/30 text-blue-300' :
                        b.balance_paid ? 'bg-emerald-500/30 text-emerald-300' :
                        'bg-purple-500/30 text-purple-300'
                      }`}>
                        {b.customer_name?.split(' ')[0]}
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-[9px] text-white/40">+{dayBookings.length - 2}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 text-xs text-white/50">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-500/30" /> <span>Booked</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500/30" /> <span>Photos Done</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500/30" /> <span>Paid</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-500/30" /> <span>Complete</span></div>
      </div>

      {/* Selected Date Bookings */}
      {selectedDate && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            {selectedDate} {monthNames[currentDate.getMonth()]} — Showroom Bookings
          </h3>
          {getBookingsForDate(selectedDate).length === 0 ? (
            <div className="card glass text-center py-8">
              <p className="text-white/40">No bookings for this date.</p>
              <button onClick={() => openNewForm(new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate))} className="btn-primary mt-3 px-4 py-2 text-sm">
                <Plus className="w-4 h-4 inline mr-1" /> Book Customer
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {getBookingsForDate(selectedDate).map(booking => (
                <div key={booking.id} className="card glass p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center text-sm font-bold">
                          {booking.customer_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <div>
                          <p className="font-semibold">{booking.customer_name}</p>
                          <div className="flex items-center gap-3 text-xs text-white/40">
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {booking.customer_phone}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {booking.scheduled_date?.split('T')[1]?.substring(0,5)}</span>
                          </div>
                        </div>
                      </div>
                      {booking.notes && (
                        <p className="text-sm text-white/50 mb-3 pl-13">{booking.notes}</p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => togglePhotos(booking.id, booking.photos_created)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                            booking.photos_created
                              ? 'bg-blue-500/30 text-blue-300 border border-blue-500/30'
                              : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {booking.photos_created ? 'Photos Created' : 'Create Photos'}
                        </button>
                        <button
                          onClick={() => togglePaid(booking.id, booking.balance_paid)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                            booking.balance_paid
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                              : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          {booking.balance_paid ? 'Balance Paid' : 'Pay Balance'}
                        </button>
                        {booking.amount_due > 0 && !booking.balance_paid && (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> £{booking.amount_due} due
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditForm(booking)} className="p-2 hover:bg-white/10 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(booking.id)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Upcoming Bookings List */}
      <div>
        <h3 className="text-lg font-semibold mb-3">All Upcoming Showroom Bookings</h3>
        {bookings.filter(b => new Date(b.scheduled_date) >= new Date()).length === 0 ? (
          <div className="card glass text-center py-8">
            <CalIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No upcoming showroom bookings.</p>
            <p className="text-sm text-white/30 mt-1">Click "Book Customer" to schedule a visit.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings
              .filter(b => new Date(b.scheduled_date) >= new Date())
              .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
              .map(booking => (
                <div key={booking.id} className="flex items-center gap-3 card glass p-3 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => {
                  const d = new Date(booking.scheduled_date);
                  setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
                  setSelectedDate(d.getDate());
                }}>
                  <div className={`w-2 h-10 rounded-full ${
                    booking.photos_created && booking.balance_paid ? 'bg-green-500' :
                    booking.photos_created ? 'bg-blue-500' :
                    booking.balance_paid ? 'bg-emerald-500' :
                    'bg-purple-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{booking.customer_name}</p>
                    <p className="text-xs text-white/40">{booking.scheduled_date?.split('T')[0]} at {booking.scheduled_date?.split('T')[1]?.substring(0,5)}</p>
                  </div>
                  <div className="flex gap-1">
                    {booking.photos_created && <Camera className="w-4 h-4 text-blue-400" />}
                    {booking.balance_paid && <CreditCard className="w-4 h-4 text-emerald-400" />}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card glass w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-bold">{editingId ? 'Edit Showroom Booking' : 'Book Showroom Visit'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Customer</label>
                <select
                  value={formData.customer_id}
                  onChange={e => setFormData({...formData, customer_id: e.target.value})}
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
                  <label className="block text-sm font-medium mb-1.5">Date</label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={e => setFormData({...formData, scheduled_date: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Time</label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={e => setFormData({...formData, scheduled_time: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Duration (min)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={e => setFormData({...formData, duration_minutes: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    min="15"
                    step="15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Amount Due (£)</label>
                  <input
                    type="number"
                    value={formData.amount_due}
                    onChange={e => setFormData({...formData, amount_due: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="What they want to see, special requirements..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm min-h-[80px]"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.photos_created}
                    onChange={e => setFormData({...formData, photos_created: e.target.checked})}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <span className="text-sm">Photos Created</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.balance_paid}
                    onChange={e => setFormData({...formData, balance_paid: e.target.checked})}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  <span className="text-sm">Balance Paid</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-white/10 rounded-xl text-sm hover:bg-white/5">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">
                  {editingId ? 'Update Booking' : 'Book Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
