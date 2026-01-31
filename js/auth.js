/* === ADMIN AUTHENTICATION MODULE === */
const Auth = {
  user: null,
  _unsubscribe: null,

  init() {
    if (!DB._firebaseReady) {
      this.updateUI(null);
      return;
    }
    // Listen for auth state changes
    this._unsubscribe = DB.auth.onAuthStateChanged(user => {
      this.user = user;
      this.updateUI(user);
      if (user) {
        console.log('Signed in as:', user.email);
        this.syncAllData();
      }
    });
    // Show login form if not authenticated after a short delay
    setTimeout(() => {
      if (!this.user && DB._firebaseReady) {
        this.showLoginForm();
      }
    }, 1500);
  },

  showLoginForm() {
    // Create overlay if it doesn't exist
    let overlay = document.getElementById('auth-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'auth-overlay';
      overlay.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(11,29,58,0.95);z-index:10000;display:flex;align-items:center;justify-content:center">
          <div style="background:white;border-radius:12px;padding:2.5rem;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
            <div style="text-align:center;margin-bottom:1.5rem">
              <div style="width:56px;height:56px;background:linear-gradient(135deg,var(--amber),var(--amber-dark));border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:700;color:white">O</div>
              <h2 style="font-family:'Playfair Display',serif;color:var(--navy);margin:0 0 0.3rem">Odisea Tours</h2>
              <p style="color:var(--gray-400);font-size:0.88rem;margin:0">Sign in to sync with Firebase</p>
            </div>
            <form id="auth-login-form" onsubmit="Auth.handleLogin(event)">
              <div style="margin-bottom:0.8rem">
                <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.3rem;color:var(--gray-600)">Email</label>
                <input type="email" id="auth-email" required style="width:100%;padding:0.6rem 0.8rem;border:1.5px solid var(--gray-200);border-radius:8px;font-size:0.9rem;box-sizing:border-box" placeholder="admin@odiseatours.com">
              </div>
              <div style="margin-bottom:1rem">
                <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.3rem;color:var(--gray-600)">Password</label>
                <input type="password" id="auth-password" required style="width:100%;padding:0.6rem 0.8rem;border:1.5px solid var(--gray-200);border-radius:8px;font-size:0.9rem;box-sizing:border-box" placeholder="Enter password">
              </div>
              <div id="auth-error" style="color:var(--red);font-size:0.82rem;margin-bottom:0.8rem;display:none"></div>
              <button type="submit" style="width:100%;padding:0.7rem;background:linear-gradient(135deg,var(--amber),var(--amber-dark));border:none;border-radius:8px;color:white;font-weight:600;font-size:0.92rem;cursor:pointer;margin-bottom:0.6rem">Sign In</button>
              <button type="button" onclick="Auth.workOffline()" style="width:100%;padding:0.6rem;background:none;border:1.5px solid var(--gray-200);border-radius:8px;color:var(--gray-500);font-size:0.85rem;cursor:pointer">Work Offline</button>
            </form>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
  },

  async handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    errorEl.style.display = 'none';

    try {
      await DB.auth.signInWithEmailAndPassword(email, password);
      // Remove overlay on success
      const overlay = document.getElementById('auth-overlay');
      if (overlay) overlay.remove();
    } catch (e) {
      errorEl.textContent = e.message.replace('Firebase: ', '');
      errorEl.style.display = 'block';
    }
  },

  workOffline() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.remove();
  },

  async logout() {
    if (!DB._firebaseReady) return;
    try {
      await DB.auth.signOut();
      this.user = null;
      this.updateUI(null);
    } catch (e) {
      console.warn('Logout failed:', e.message);
    }
  },

  // Sync all collections from localStorage to Firestore on login
  async syncAllData() {
    if (!DB._firebaseReady || !this.user) return;
    try {
      // Push local data to Firestore
      await DB.syncToFirestore('tours', DB.getTours());
      await DB.syncToFirestore('quotes', DB.getQuotes());
      await DB.syncToFirestore('invoices', DB.getInvoices());
      await DB.syncToFirestore('clients', DB.getClients());
      await DB.syncToFirestore('providers', DB.getProviders());
      console.log('All data synced to Firestore.');
    } catch (e) {
      console.warn('Sync failed:', e.message);
    }
  },

  updateUI(user) {
    // Add or update the auth indicator in sidebar
    let indicator = document.getElementById('auth-indicator');
    if (!indicator) {
      const footer = document.querySelector('.sidebar-footer');
      if (!footer) return;
      indicator = document.createElement('div');
      indicator.id = 'auth-indicator';
      indicator.style.cssText = 'padding:0.4rem 0.6rem;font-size:0.78rem;border-radius:6px;margin-bottom:0.5rem;text-align:center';
      footer.prepend(indicator);
    }

    if (user) {
      indicator.style.background = 'rgba(46,204,113,0.15)';
      indicator.style.color = 'var(--green)';
      indicator.innerHTML = `<span style="display:inline-block;width:6px;height:6px;background:var(--green);border-radius:50%;margin-right:4px"></span>${user.email.split('@')[0]} <a href="#" onclick="Auth.logout();return false" style="color:var(--gray-400);margin-left:4px;font-size:0.72rem">logout</a>`;
    } else if (DB._firebaseReady) {
      indicator.style.background = 'rgba(232,145,58,0.15)';
      indicator.style.color = 'var(--amber)';
      indicator.innerHTML = '<span style="cursor:pointer" onclick="Auth.showLoginForm()">Not signed in — click to login</span>';
    } else {
      indicator.style.background = 'rgba(127,140,141,0.15)';
      indicator.style.color = 'var(--gray-400)';
      indicator.innerHTML = 'Offline mode (no Firebase)';
    }
  }
};
