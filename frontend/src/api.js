const API_URL = '';

async function api(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

export const API = {
  // Dashboard
  getDashboard: () => api('/api/dashboard'),

  // Customers
  getCustomers: (search = '') => api(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCustomer: (id) => api(`/api/customers/${id}`),
  createCustomer: (data) => api('/api/customers', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }),

  // Products
  getProducts: () => api('/api/products'),

  // Quotes
  getQuotes: () => api('/api/quotes'),
  createQuote: (data) => api('/api/quotes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }),
  shareQuote: (id) => api(`/api/quotes/${id}/share`, { method: 'POST' }),
  updateQuoteStatus: (id, status) => api(`/api/quotes/${id}/status`, {
    method: 'PATCH', body: new URLSearchParams({ status })
  }),
  uploadVisual: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return api(`/api/quotes/${id}/visual`, { method: 'POST', body: form });
  },

  // Samples
  createSample: (customerId, productId) => api('/api/samples', {
    method: 'POST', body: new URLSearchParams({ customer_id: customerId, product_id: productId })
  }),
  getPendingFollowups: () => api('/api/samples/pending-followup'),
  sendFollowUp: (id, message, stage) => api(`/api/samples/${id}/follow-up`, {
    method: 'POST', body: new URLSearchParams({ message, stage })
  }),

  // Appointments
  createAppointment: (data) => api('/api/appointments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }),
  getAppointment: (id) => api(`/api/appointments/${id}`),
  updateAppointment: (id, data) => api(`/api/appointments/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }),
  deleteAppointment: (id) => api(`/api/appointments/${id}`, { method: 'DELETE' }),
  getCalendar: (start, end) => api(`/api/calendar?start=${start}&end=${end}`),
  completeAppointment: (id, file) => {
    const form = new FormData();
    if (file) form.append('install_photo', file);
    return api(`/api/appointments/${id}/complete`, { method: 'POST', body: form });
  },

  // Fitters
  getFitters: () => api('/api/fitters'),
  createFitter: (data) => api('/api/fitters', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }),
  updateFitter: (id, data) => api(`/api/fitters/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }),
  deleteFitter: (id) => api(`/api/fitters/${id}`, { method: 'DELETE' }),

  // Showroom
  getShowroomItems: (category) => api(`/api/showroom${category ? `?category=${category}` : ''}`),
  createShowroomItem: (formData) => api('/api/showroom', { method: 'POST', body: formData }),
  updateShowroomItem: (id, formData) => api(`/api/showroom/${id}`, { method: 'PUT', body: formData }),
  deleteShowroomItem: (id) => api(`/api/showroom/${id}`, { method: 'DELETE' }),

  // Reviews
  getPendingReviews: () => api('/api/reviews/pending'),
  completeReview: (id, rating) => api(`/api/reviews/${id}/complete`, {
    method: 'POST', body: new URLSearchParams({ rating, comment: '' })
  }),

  // Messages
  getWhatsAppLink: (customerId, message) => api(`/api/messages/whatsapp-link?customer_id=${customerId}&message=${encodeURIComponent(message)}`),

  // Reactivation
  getReactivationOpps: () => api('/api/reactivation/opportunities'),
  sendReactivation: (customerId, message) => api('/api/reactivation/send', {
    method: 'POST', body: new URLSearchParams({ customer_id: customerId, message })
  }),

  // Analytics
  getAnalytics: () => api('/api/analytics'),
};

export function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
}

export function formatPhoneForWhatsApp(phone) {
  return phone?.replace(/\D/g, '').replace(/^0/, '44') || '';
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
