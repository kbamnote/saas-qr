// Common helpers
const API = '/api';

function getToken() { return localStorage.getItem('token'); }
function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
function getUser() { return JSON.parse(localStorage.getItem('user') || 'null'); }
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

async function apiCall(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const res = await fetch(API + endpoint, { ...options, headers });
  const data = await res.json();
  
  if (res.status === 401) {
    logout();
    return data;
  }
  return { ...data, _status: res.status };
}

function showAlert(message, type = 'info', containerId = 'alertBox') {
  const box = document.getElementById(containerId);
  if (!box) { alert(message); return; }
  box.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { box.innerHTML = ''; }, 5000);
}

function requireAuth(adminRequired = false) {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = '/login';
    return null;
  }
  if (adminRequired && user.role !== 'superadmin') {
    window.location.href = '/dashboard';
    return null;
  }
  return user;
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatINR(n) {
  return '₹' + (n || 0).toLocaleString('en-IN');
}

// Razorpay payment helper
function openRazorpay(orderId, amount, keyId, userInfo, onSuccess) {
  const options = {
    key: keyId,
    amount: amount * 100,
    currency: 'INR',
    name: 'QR Forms SaaS',
    description: 'Payment',
    order_id: orderId,
    handler: async function(response) {
      const verify = await apiCall('/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        })
      });
      if (verify.success) onSuccess(verify);
      else alert('Payment verification failed: ' + verify.message);
    },
    prefill: {
      name: userInfo.name || '',
      email: userInfo.email || '',
      contact: userInfo.phone || ''
    },
    theme: { color: '#4f46e5' }
  };
  const rzp = new Razorpay(options);
  rzp.open();
}
