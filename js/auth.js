/* === ADMIN AUTHENTICATION MODULE === */
const Auth = {
  user: null,
  _unsubscribe: null,
  _syncInterval: null,
  _syncing: false,
  SYNC_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  COLLECTIONS: ['tours', 'quotes', 'invoices', 'clients', 'providers'],

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
        this._startAutoSync();
      } else {
        this._stopAutoSync();
      }
    });
    // Sync when app regains focus (e.g. switching back from another app)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.user) this.syncAllData();
    });
    // Show login form if not authenticated after a short delay
    setTimeout(() => {
      if (!this.user && DB._firebaseReady) {
        this.showLoginForm();
      }
    }, 1500);
  },

  _startAutoSync() {
    this._stopAutoSync();
    this._syncInterval = setInterval(() => this.syncAllData(), this.SYNC_INTERVAL_MS);
  },

  _stopAutoSync() {
    if (this._syncInterval) { clearInterval(this._syncInterval); this._syncInterval = null; }
  },

  showLoginForm() {
    // Create overlay if it doesn't exist
    let overlay = document.getElementById('auth-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'auth-overlay';
      overlay.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(17,17,17,0.95);z-index:10000;display:flex;align-items:center;justify-content:center">
          <div style="background:white;border-radius:12px;padding:2.5rem;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
            <div style="text-align:center;margin-bottom:1.5rem">
              <img src="img/logo-black.png" alt="Odisea Tours" style="height:48px;width:auto;margin:0 auto 1rem;display:block">
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
    this._stopAutoSync();
    try {
      await DB.auth.signOut();
      this.user = null;
      this.updateUI(null);
    } catch (e) {
      console.warn('Logout failed:', e.message);
    }
  },

  // Two-way sync: pull from Firestore, merge, push back
  async syncAllData() {
    if (!DB._firebaseReady || !this.user || this._syncing) return;
    this._syncing = true;
    this._updateSyncIndicator('syncing');
    try {
      for (const col of this.COLLECTIONS) {
        // 1. Pull remote data
        const remote = await DB.pullFromFirestore(col);
        const local = DB._getAll(col); // includes soft-deleted items

        // 2. Merge: build map by id, newest updatedAt wins
        const merged = new Map();
        local.forEach(item => merged.set(String(item.id), item));
        let pulled = 0;
        remote.forEach(item => {
          const key = item._firestoreId || String(item.id);
          const numId = Number(key) || item.id;
          item.id = numId;
          delete item._firestoreId;
          const existing = merged.get(String(numId));
          if (!existing) {
            // New item from another device
            merged.set(String(numId), item);
            pulled++;
          } else if (existing._deleted) {
            // Locally deleted — don't bring it back, delete from Firestore
            DB.firestore.collection(col).doc(String(numId)).delete().catch(() => {});
          } else {
            // Compare updatedAt — remote wins if newer
            const remoteTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
            const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            if (remoteTime > localTime) {
              merged.set(String(numId), item);
              pulled++;
            }
          }
        });

        // 3. Delete soft-deleted items from Firestore
        const all = Array.from(merged.values());
        const alive = [];
        for (const item of all) {
          if (item._deleted) {
            await DB.firestore.collection(col).doc(String(item.id)).delete().catch(() => {});
          } else {
            alive.push(item);
          }
        }

        // 4. Keep tombstones in localStorage so future syncs remember deletions
        DB._set(col, all);

        // 5. Push only alive data to Firestore
        await DB.syncToFirestore(col, alive);
        if (pulled > 0) console.log(`Pulled ${pulled} updated items for ${col}`);
      }

      this._lastSync = new Date();
      this._updateSyncIndicator('done');
      console.log('Two-way sync complete.');
      // Refresh current view if data changed
      if (typeof App !== 'undefined' && App._currentTab) {
        const tab = App._currentTab;
        if (tab === 'dashboard' && typeof Dashboard !== 'undefined') Dashboard.render();
        else if (tab === 'tours' && typeof Tours !== 'undefined') Tours.render();
        else if (tab === 'crm' && typeof CRM !== 'undefined') CRM.render();
        else if (tab === 'invoicing' && typeof Invoicing !== 'undefined') Invoicing.render();
      }
    } catch (e) {
      console.warn('Sync failed:', e.message);
      this._updateSyncIndicator('error');
    } finally {
      this._syncing = false;
    }
  },

  // Manual sync trigger
  async manualSync() {
    await this.syncAllData();
    if (this._lastSync) alert('Sync complete! Data is up to date.');
  },

  _updateSyncIndicator(state) {
    let el = document.getElementById('sync-status');
    if (!el) return;
    if (state === 'syncing') {
      el.innerHTML = '<span style="color:var(--amber)">⟳ Syncing...</span>';
    } else if (state === 'done') {
      const t = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      el.innerHTML = `<span style="color:var(--green)">✓ Synced ${t}</span>`;
    } else {
      el.innerHTML = '<span style="color:var(--red)">✗ Sync error</span>';
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
      indicator.innerHTML = `<span style="display:inline-block;width:6px;height:6px;background:var(--green);border-radius:50%;margin-right:4px"></span>${user.email.split('@')[0]} <a href="#" onclick="Auth.logout();return false" style="color:var(--gray-400);margin-left:4px;font-size:0.72rem">logout</a>
        <div id="sync-status" style="margin-top:0.3rem;font-size:0.72rem"></div>
        <a href="#" onclick="Auth.manualSync();return false" style="display:inline-block;margin-top:0.25rem;font-size:0.72rem;color:var(--amber);text-decoration:none">⟳ Sync Now</a>`;
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
