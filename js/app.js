/* === APP CONTROLLER === */
const App = {
  currentTab: 'dashboard',

  init() {
    // Initialize Firebase (before modules)
    DB.initFirebase();

    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        App.switchTab(item.dataset.tab);
      });
    });

    // Seed default providers if empty
    DB.seedProviders();

    // Initialize all modules
    Dashboard.init();
    Quote.init();
    CRM.init();
    Tours.init();
    Invoicing.init();
    Email.init();
    Passengers.init();
    Clients.init();
    Providers.init();

    // Initialize Auth (after modules, so UI is ready)
    Auth.init();
  },

  switchTab(tab) {
    this.currentTab = tab;
    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add('active');
    // Update content
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    // Refresh the module
    this.refreshTab(tab);
  },

  refreshTab(tab) {
    switch (tab) {
      case 'dashboard': Dashboard.render(); break;
      case 'new-quote': Quote.render(); break;
      case 'crm': CRM.render(); break;
      case 'tours': Tours.render(); break;
      case 'invoicing': Invoicing.render(); break;
      case 'email': Email.render(); break;
      case 'passengers': Passengers.init(); break;
      case 'clients': Clients.render(); break;
      case 'providers': Providers.render(); break;
    }
  },

  exportAllData() {
    const json = DB.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'odisea_tours_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      if (DB.importAll(e.target.result)) {
        alert('Data imported successfully!');
        App.refreshTab(App.currentTab);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }
};

// Boot
document.addEventListener('DOMContentLoaded', App.init.bind(App));

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.log('SW registration failed:', err));
  });
}
