/**
 * js/script.js
 * Handles: Mobile Nav, Dark Mode, Form Submission with fetch() API integration
 */

// ── DOM Ready ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initDarkMode();
  initOrderForm();
  highlightActiveLink();
  setMinDeliveryDate();
});

// ── Navbar & Mobile Menu ─────────────────────────────────────────────────────
function initNavbar() {
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');
  const navbar    = document.getElementById('navbar');
  if (!navToggle || !navLinks) return;

  // Hamburger toggle
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    const spans = navToggle.querySelectorAll('span');
    if (navLinks.classList.contains('active')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
    } else {
      spans[0].style.transform = 'none';
      spans[1].style.opacity   = '1';
      spans[2].style.transform = 'none';
    }
  });

  // Close menu when a link is clicked
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('active'));
  });

  // Shrink navbar on scroll
  window.addEventListener('scroll', () => {
    if (!navbar) return;
    navbar.style.boxShadow = window.scrollY > 50
      ? '0 4px 20px rgba(0,0,0,0.12)'
      : '0 4px 6px rgba(0,0,0,0.05)';
  });
}

// ── Dark Mode ────────────────────────────────────────────────────────────────
function initDarkMode() {
  const darkToggle = document.getElementById('darkToggle');
  const darkIcon   = document.getElementById('darkIcon');
  if (!darkToggle) return;

  // Restore preference
  if (localStorage.getItem('theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    darkIcon && darkIcon.classList.replace('fa-moon', 'fa-sun');
  }

  darkToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.body.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      darkIcon && darkIcon.classList.replace('fa-sun', 'fa-moon');
    } else {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      darkIcon && darkIcon.classList.replace('fa-moon', 'fa-sun');
    }
  });
}

// ── Highlight Active Nav Link ────────────────────────────────────────────────
function highlightActiveLink() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === page) link.classList.add('active');
  });
}

// ── Set minimum delivery date to today ───────────────────────────────────────
function setMinDeliveryDate() {
  const dateInput = document.getElementById('deliveryDate');
  if (!dateInput) return;
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);
  dateInput.value = today; // Default to today
}

// ── API Config ──────────────────────────────────────────────────────────────
// On GitHub Pages there is no backend – the form will auto-fallback to WhatsApp.
// When you deploy the backend (e.g. on Render.com), replace the URL below.
const isGitHubPages = window.location.hostname.includes('github.io');
const API_URL = isGitHubPages
  ? null   // No backend on GitHub Pages → will trigger WhatsApp fallback
  : 'http://localhost:5000/api/orders'; // Local development backend

function initOrderForm() {
  const form       = document.getElementById('orderForm');
  const submitBtn  = document.getElementById('submitBtn');
  const btnText    = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');
  const statusBox  = document.getElementById('formStatus');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect form data
    const payload = {
      name:         document.getElementById('name')?.value.trim(),
      phone:        document.getElementById('phone')?.value.trim(),
      address:      document.getElementById('address')?.value.trim(),
      quantity:     parseInt(document.getElementById('quantity')?.value, 10),
      deliveryDate: document.getElementById('deliveryDate')?.value,
      message:      document.getElementById('message')?.value.trim() || '',
    };

    // Basic client-side validation
    if (!payload.name || !payload.phone || !payload.address || !payload.deliveryDate) {
      showStatus(statusBox, 'Please fill all required fields.', 'error');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(payload.phone)) {
      showStatus(statusBox, 'Please enter a valid 10-digit Indian mobile number.', 'error');
      return;
    }

    // Show loading state
    setLoading(submitBtn, btnText, btnSpinner, true);
    hideStatus(statusBox);

    // Build WhatsApp fallback URL (used both when no backend and on error)
    const waText = encodeURIComponent(
      `New Order!\nName: ${payload.name}\nPhone: ${payload.phone}\nAddress: ${payload.address}\nQuantity: ${payload.quantity} can(s)\nDelivery Date: ${payload.deliveryDate}\nMessage: ${payload.message || 'None'}`
    );
    const waLink = `<a href="https://wa.me/919618769101?text=${waText}" target="_blank" style="color:#25d366;font-weight:700;">Click here to order via WhatsApp</a>`;

    // If no backend (GitHub Pages), show WhatsApp link directly
    if (!API_URL) {
      setLoading(submitBtn, btnText, btnSpinner, false);
      showStatus(statusBox, `📱 Order via WhatsApp: ${waLink}`, 'warning');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showStatus(statusBox, `✅ ${data.message}`, 'success');
        form.reset();
        setMinDeliveryDate();
      } else {
        const errMsg = data.errors
          ? data.errors.map(err => err.message).join(' ')
          : data.message || 'Something went wrong. Please try again.';
        showStatus(statusBox, `❌ ${errMsg}`, 'error');
      }
    } catch (networkError) {
      console.warn('Backend unavailable. Falling back to WhatsApp.', networkError);
      showStatus(statusBox, `⚠️ Server offline. ${waLink} instead.`, 'warning');
    } finally {
      setLoading(submitBtn, btnText, btnSpinner, false);
    }
  });
}

// ── UI Helpers ───────────────────────────────────────────────────────────────
function setLoading(btn, textEl, spinnerEl, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  if (textEl)    textEl.textContent = isLoading ? 'Placing Order...' : 'Submit Request';
  if (spinnerEl) spinnerEl.style.display = isLoading ? 'inline-block' : 'none';
}

function showStatus(el, html, type) {
  if (!el) return;
  const colors = {
    success: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
    error:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
    warning: { bg: '#fef9c3', color: '#713f12', border: '#fde047' },
  };
  const c = colors[type] || colors.error;
  el.style.cssText = `display:block; padding:1rem; border-radius:8px; margin-top:1rem;
    text-align:center; font-weight:600; background:${c.bg}; color:${c.color};
    border:1px solid ${c.border};`;
  el.innerHTML = html;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideStatus(el) {
  if (el) el.style.display = 'none';
}
