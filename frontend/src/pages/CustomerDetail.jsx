import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Package, CalendarPlus, Plus, ChevronLeft, Share2, ExternalLink } from 'lucide-react';
import { API, getInitials, formatPhoneForWhatsApp, formatDate } from '../api';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  // Quote form state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [roomName, setRoomName] = useState('Living Room');
  const [roomWidth, setRoomWidth] = useState(4.0);
  const [roomLength, setRoomLength] = useState(5.0);
  const [underlay, setUnderlay] = useState(0);
  const [fitting, setFitting] = useState(0);
  const [disposal, setDisposal] = useState(0);

  useEffect(() => {
    loadData();
    loadProducts();
  }, [id]);

  useEffect(() => {
    if (data?.samples?.length > 0) {
      const lastSample = data.samples[data.samples.length - 1];
      if (lastSample.product_id) {
        fetch(`/api/products/${lastSample.product_id}/recommendations`)
          .then(r => r.json())
          .then(data => setRecommendations(data));
      }
    }
  }, [data]);

  async function loadData() {
    try {
      const res = await API.getCustomer(id);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const res = await API.getProducts();
      setProducts(res);
    } catch (e) {
      console.error(e);
    }
  }

  const area = (parseFloat(roomWidth) || 0) * (parseFloat(roomLength) || 0);
  const productTotal = selectedProduct ? area * selectedProduct.price_per_sqm : 0;
  const total = productTotal + (parseFloat(underlay) || 0) + (parseFloat(fitting) || 0) + (parseFloat(disposal) || 0);
  const costTotal = selectedProduct ? area * selectedProduct.cost_per_sqm + (parseFloat(underlay) || 0) * 0.5 + (parseFloat(fitting) || 0) * 0.4 : 0;
  const margin = total - costTotal;

  async function handleCall() {
    if (data?.customer?.phone) {
      window.location.href = `tel:${data.customer.phone}`;
    }
  }

  async function handleWhatsApp() {
    if (data?.customer?.phone) {
      const phone = formatPhoneForWhatsApp(data.customer.phone);
      window.open(`https://wa.me/${phone}`, '_blank');
    }
  }

  async function handleSample() {
    const pid = prompt('Enter product ID to sample:');
    if (!pid) return;
    try {
      await API.createSample(id, pid);
      alert('Sample created');
      loadData();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  async function handleBook() {
    const fitter = prompt('Fitter name:');
    const dateStr = prompt('Date (YYYY-MM-DD HH:MM):');
    if (!fitter || !dateStr) return;
    try {
      await API.createAppointment({ customer_id: parseInt(id), type: 'measure', fitter_name: fitter, scheduled_date: dateStr });
      alert('Appointment booked');
      loadData();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  async function submitQuote() {
    if (!selectedProduct) {
      alert('Select a product');
      return;
    }
    try {
      const res = await API.createQuote({
        customer_id: parseInt(id),
        room_name: roomName,
        room_width: parseFloat(roomWidth),
        room_length: parseFloat(roomLength),
        product_id: selectedProduct.id,
        underlay_price: parseFloat(underlay) || 0,
        fitting_price: parseFloat(fitting) || 0,
        disposal_price: parseFloat(disposal) || 0,
        extras_price: 0,
        financing_months: 0
      });
      const share = await API.shareQuote(res.id);
      alert(`Quote created! Share link: ${share.share_url}`);
      setShowQuoteForm(false);
      setSelectedProduct(null);
      loadData();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  }

  if (loading) {
    return (
      <div className="px-5 pt-6 pb-4">
        <div className="shimmer h-8 w-32 rounded-lg mb-4"></div>
        <div className="shimmer h-24 rounded-2xl mb-4"></div>
      </div>
    );
  }

  const customer = data?.customer || {};
  const quotes = data?.quotes || [];
  const samples = data?.samples || [];
  const appointments = data?.appointments || [];

  return (
    <div className="px-5 pt-6 pb-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-white/40 mb-4">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="card glass p-5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-black text-lg">
            {getInitials(customer.name)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{customer.name}</h1>
            <p className="text-sm text-white/40">{customer.phone}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button onClick={handleCall} className="btn-secondary py-2 text-xs flex flex-col items-center gap-1">
            <Phone className="w-4 h-4" /> Call
          </button>
          <button onClick={handleWhatsApp} className="btn-secondary py-2 text-xs flex flex-col items-center gap-1">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
          <button onClick={handleSample} className="btn-secondary py-2 text-xs flex flex-col items-center gap-1">
            <Package className="w-4 h-4" /> Sample
          </button>
          <button onClick={handleBook} className="btn-secondary py-2 text-xs flex flex-col items-center gap-1">
            <CalendarPlus className="w-4 h-4" /> Book
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="card glass p-4 mb-4">
        <h2 className="font-semibold mb-3">Details</h2>
        <div className="space-y-2 text-sm">
          {customer.email && <p className="text-white/60"><span className="text-white/30">Email:</span> {customer.email}</p>}
          {customer.address && <p className="text-white/60"><span className="text-white/30">Address:</span> {customer.address}</p>}
          {customer.source && <p className="text-white/60"><span className="text-white/30">Source:</span> {customer.source}</p>}
          {customer.notes && <p className="text-white/60"><span className="text-white/30">Notes:</span> {customer.notes}</p>}
        </div>
      </div>

      {/* Quotes */}
      <div className="card glass p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Quotes</h2>
          <button onClick={() => setShowQuoteForm(!showQuoteForm)} className="text-xs text-amber-400 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Create
          </button>
        </div>

        {showQuoteForm && (
          <div className="mb-4 p-3 rounded-xl bg-white/4 border border-white/10">
            <p className="text-sm font-medium mb-2">Select Product</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`p-2 rounded-xl border text-xs text-center transition-all ${selectedProduct?.id === p.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 hover:border-white/20'}`}
                >
                  {p.image && <img src={p.image} className="w-full h-12 object-cover rounded-lg mb-1" alt="" />}
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-white/40">£{p.price_per_sqm}/m²</p>
                </button>
              ))}
            </div>

            <div className="space-y-2 mb-3">
              <input value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Room name" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="0.1" value={roomWidth} onChange={e => setRoomWidth(e.target.value)} placeholder="Width (m)" />
                <input type="number" step="0.1" value={roomLength} onChange={e => setRoomLength(e.target.value)} placeholder="Length (m)" />
              </div>
              <p className="text-xs text-white/40">Area: {area.toFixed(2)} m²</p>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" value={underlay} onChange={e => setUnderlay(e.target.value)} placeholder="Underlay £" />
                <input type="number" value={fitting} onChange={e => setFitting(e.target.value)} placeholder="Fitting £" />
                <input type="number" value={disposal} onChange={e => setDisposal(e.target.value)} placeholder="Disposal £" />
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-lg font-bold text-amber-400">£{total.toFixed(2)}</p>
                <p className="text-xs text-white/40">Margin: £{margin.toFixed(2)}</p>
              </div>
              <button onClick={submitQuote} className="btn-primary px-4 py-2 text-sm">Save Quote</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {quotes.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-2">No quotes yet</p>
          ) : (
            quotes.map(q => (
              <div key={q.id} className="p-3 rounded-xl bg-white/4 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{q.room_name}</p>
                    <p className="text-xs text-white/40">{q.product_name}</p>
                  </div>
                  <span className={`status-badge ${q.status === 'accepted' ? 'status-accepted' : 'status-lead'}`}>{q.status}</span>
                </div>
                <p className="text-xs text-white/40 mt-1">£{q.total?.toFixed(2)} · Margin £{q.margin?.toFixed(2)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Samples */}
      <div className="card glass p-4 mb-4">
        <h2 className="font-semibold mb-3">Samples</h2>
        <div className="space-y-2">
          {samples.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-2">No samples</p>
          ) : (
            samples.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/5">
                {s.product_image && <img src={s.product_image} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.product_name}</p>
                  <p className="text-xs text-white/40">
                    {s.follow_up_1_sent ? 'Follow-up 1 sent' : 'Follow-up 1 pending'}
                    {' · '}
                    {s.follow_up_2_sent ? 'Follow-up 2 sent' : 'Follow-up 2 pending'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Similar Recommendations */}
      {recommendations.length > 0 && (
        <div className="card glass p-4 mb-4">
          <h2 className="font-semibold mb-3">🎯 You May Also Like</h2>
          <div className="grid grid-cols-2 gap-3">
            {recommendations.map(r => (
              <div key={r.id} className="p-3 rounded-xl bg-white/4 border border-white/5">
                {r.image && <img src={r.image} className="w-full h-20 object-cover rounded-lg mb-2" alt="" />}
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-white/40">{r.category} · £{r.price_per_sqm}/m²</p>
                <button
                  onClick={() => { setSelectedProduct(r); setShowQuoteForm(true); window.scrollTo(0, 0); }}
                  className="mt-2 w-full py-1.5 text-xs rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20"
                >
                  Create Quote
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appointments */}
      <div className="card glass p-4 mb-4">
        <h2 className="font-semibold mb-3">Appointments</h2>
        <div className="space-y-2">
          {appointments.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-2">No appointments</p>
          ) : (
            appointments.map(a => (
              <div key={a.id} className="p-3 rounded-xl bg-white/4 border border-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium capitalize">{a.type}</p>
                  <span className={`status-badge ${a.status === 'completed' ? 'status-accepted' : 'status-lead'}`}>{a.status}</span>
                </div>
                <p className="text-xs text-white/40">{formatDate(a.scheduled_date)}</p>
                {a.fitter_name && <p className="text-xs text-white/40">Fitter: {a.fitter_name}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
