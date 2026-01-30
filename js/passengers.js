/* === PASSENGERS MODULE === */
const Passengers = {
  init() {
    const tours = DB.getTours();
    const sel = document.getElementById('pax-tour-select');
    const current = sel.value;
    sel.innerHTML = '<option value="">Select a tour...</option>' +
      tours.map(t => `<option value="${t.id}" ${t.id == current ? 'selected' : ''}>${t.tourName} — ${t.destination} (${t.clientName || ''})</option>`).join('');
    this.render();
  },

  render() {
    const tourId = Number(document.getElementById('pax-tour-select').value);
    if (!tourId) {
      document.getElementById('passengers-table-container').innerHTML = '<div class="empty-state">Select a tour to manage passengers.</div>';
      return;
    }
    const passengers = DB.getPassengers().filter(p => p.tourId === tourId);
    if (!passengers.length) {
      document.getElementById('passengers-table-container').innerHTML = '<div class="empty-state">No passengers registered. Click "+ Add Passenger" to start.</div>';
      return;
    }
    document.getElementById('passengers-table-container').innerHTML = `
      <table class="data-table">
        <thead><tr><th>#</th><th>Name</th><th>DOB</th><th>Nationality</th><th>Passport</th><th>Category</th><th>Dietary</th><th>Emergency Contact</th><th>Actions</th></tr></thead>
        <tbody>${passengers.map((p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${p.firstName} ${p.lastName}</strong></td>
            <td>${fmtDate(p.dateOfBirth)}</td>
            <td>${p.nationality || '—'}</td>
            <td>${p.passportNumber || '—'}</td>
            <td><span class="badge ${p.category === 'Student' ? 'badge-sent' : p.category === 'Sibling' ? 'badge-followup' : 'badge-confirmed'}">${p.category}</span></td>
            <td>${p.dietaryRequirements || '—'}</td>
            <td>${p.emergencyContactName || '—'} ${p.emergencyContactPhone ? '(' + p.emergencyContactPhone + ')' : ''}</td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="Passengers.editPassenger(${p.id})">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="if(confirm('Delete?')){Passengers.deletePassenger(${p.id})}">Del</button>
            </td>
          </tr>`).join('')}</tbody>
      </table>
      <div style="margin-top:0.8rem;color:var(--gray-400);font-size:0.85rem">Total: ${passengers.length} passengers</div>`;
  },

  showForm(passenger) {
    const p = passenger || {};
    const tourId = Number(document.getElementById('pax-tour-select').value);
    document.getElementById('pax-modal').style.display = 'flex';
    document.getElementById('pax-modal-content').innerHTML = `
      <h2>${p.id ? 'Edit' : 'Add'} Passenger</h2>
      <input type="hidden" id="pax-id" value="${p.id || ''}">
      <input type="hidden" id="pax-tourId" value="${p.tourId || tourId}">
      <div class="form-row form-row-2">
        <div class="form-group"><label>First Name</label><input id="pax-first" value="${p.firstName || ''}"></div>
        <div class="form-group"><label>Last Name</label><input id="pax-last" value="${p.lastName || ''}"></div>
      </div>
      <div class="form-row form-row-3">
        <div class="form-group"><label>Date of Birth</label><input id="pax-dob" type="date" value="${p.dateOfBirth || ''}"></div>
        <div class="form-group"><label>Nationality</label><input id="pax-nat" value="${p.nationality || ''}"></div>
        <div class="form-group"><label>Passport Number</label><input id="pax-passport" value="${p.passportNumber || ''}"></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Category</label><select id="pax-cat"><option ${p.category==='Student'?'selected':''}>Student</option><option ${p.category==='Sibling'?'selected':''}>Sibling</option><option ${p.category==='Adult'?'selected':''}>Adult</option></select></div>
        <div class="form-group"><label>Room Preference</label><input id="pax-room" value="${p.roomPreference || ''}" placeholder="e.g. Room 1, with John"></div>
      </div>
      <div class="form-group"><label>Dietary Requirements</label><input id="pax-diet" value="${p.dietaryRequirements || ''}" placeholder="e.g. Vegetarian, Halal, Allergies..."></div>
      <div class="form-group"><label>Medical Conditions</label><textarea id="pax-medical" rows="2" placeholder="Any medical conditions...">${p.medicalConditions || ''}</textarea></div>
      <div class="form-row form-row-2">
        <div class="form-group"><label>Emergency Contact Name</label><input id="pax-emname" value="${p.emergencyContactName || ''}"></div>
        <div class="form-group"><label>Emergency Contact Phone</label><input id="pax-emphone" value="${p.emergencyContactPhone || ''}"></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="Passengers.savePassenger()">Save</button>
        <button class="btn btn-outline" onclick="closeModal('pax-modal')">Cancel</button>
      </div>`;
  },

  addPassenger() {
    if (!Number(document.getElementById('pax-tour-select').value)) { alert('Select a tour first.'); return; }
    this.showForm();
  },

  editPassenger(id) {
    const p = DB.getPassengers().find(x => x.id === id);
    if (p) this.showForm(p);
  },

  savePassenger() {
    const id = document.getElementById('pax-id').value;
    const p = {
      tourId: Number(document.getElementById('pax-tourId').value),
      firstName: document.getElementById('pax-first').value,
      lastName: document.getElementById('pax-last').value,
      dateOfBirth: document.getElementById('pax-dob').value,
      nationality: document.getElementById('pax-nat').value,
      passportNumber: document.getElementById('pax-passport').value,
      category: document.getElementById('pax-cat').value,
      roomPreference: document.getElementById('pax-room').value,
      dietaryRequirements: document.getElementById('pax-diet').value,
      medicalConditions: document.getElementById('pax-medical').value,
      emergencyContactName: document.getElementById('pax-emname').value,
      emergencyContactPhone: document.getElementById('pax-emphone').value
    };
    if (id) p.id = Number(id);
    DB.savePassenger(p);
    closeModal('pax-modal');
    this.render();
  },

  deletePassenger(id) { DB.deletePassenger(id); this.render(); },

  printForm() {
    const tourId = Number(document.getElementById('pax-tour-select').value);
    if (!tourId) { alert('Select a tour first.'); return; }
    const tour = DB.getTours().find(t => t.id === tourId);
    if (!tour) return;
    const totalPax = (tour.numStudents||0) + (tour.numSiblings||0) + (tour.numAdults||0);
    const rows = Array.from({length: Math.max(totalPax, 10)}, (_, i) =>
      `<tr><td>${i+1}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('');
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Registration Form</title><style>body{font-family:Arial,sans-serif;padding:2rem;color:#2E3440}h1{font-size:1.4rem;margin-bottom:.3rem}table{width:100%;border-collapse:collapse;font-size:.8rem}th,td{border:1px solid #ccc;padding:.4rem;text-align:left}th{background:#f0f0f0;font-size:.75rem;text-transform:uppercase}td{height:1.8rem}@media print{body{padding:.5rem}}</style></head><body><h1>Odisea Tours — Passenger Registration Form</h1><p style="margin-bottom:1rem"><strong>Tour:</strong> ${tour.tourName} | <strong>Destination:</strong> ${tour.destination} | <strong>Dates:</strong> ${tour.startDate||''} to ${tour.endDate||''} | <strong>Nights:</strong> ${tour.nights}</p><table><thead><tr><th>#</th><th>Full Name</th><th>DOB</th><th>Nationality</th><th>Passport</th><th>Category</th><th>Dietary</th><th>Medical</th><th>Emergency Name</th><th>Emergency Phone</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.print();
  },

  exportList() {
    const tourId = Number(document.getElementById('pax-tour-select').value);
    if (!tourId) { alert('Select a tour first.'); return; }
    const tour = DB.getTours().find(t => t.id === tourId);
    const pax = DB.getPassengers().filter(p => p.tourId === tourId);
    if (!pax.length) { alert('No passengers to export.'); return; }
    const h = ['First Name','Last Name','DOB','Nationality','Passport','Category','Dietary','Medical','Emergency Name','Emergency Phone','Room'];
    const csv = [h.join(',')].concat(pax.map(p =>
      [p.firstName,p.lastName,p.dateOfBirth,p.nationality,p.passportNumber,p.category,p.dietaryRequirements,p.medicalConditions,p.emergencyContactName,p.emergencyContactPhone,p.roomPreference]
        .map(v=>'"'+(v||'').replace(/"/g,'""')+'"').join(',')
    )).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'passengers_'+(tour?tour.tourName.replace(/\s+/g,'_'):'tour')+'.csv';
    a.click();
  },

  generateRoomingList() {
    const tourId = Number(document.getElementById('pax-tour-select').value);
    if (!tourId) { alert('Select a tour first.'); return; }
    const tour = DB.getTours().find(t => t.id === tourId);
    const pax = DB.getPassengers().filter(p => p.tourId === tourId);
    if (!pax.length) { alert('No passengers.'); return; }
    const rooms = {};
    pax.forEach(p => { const r = p.roomPreference||'Unassigned'; if(!rooms[r])rooms[r]=[]; rooms[r].push(p); });
    let rows = '';
    Object.keys(rooms).forEach(room => {
      rooms[room].forEach((p,i) => {
        rows += `<tr><td>${i===0?room:''}</td><td>${p.firstName} ${p.lastName}</td><td>${p.category}</td><td>${p.dietaryRequirements||'—'}</td></tr>`;
      });
    });
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Rooming List</title><style>body{font-family:Arial,sans-serif;padding:2rem;color:#2E3440}h1{font-size:1.4rem}table{width:100%;border-collapse:collapse;font-size:.85rem}th,td{border:1px solid #ccc;padding:.4rem;text-align:left}th{background:#f0f0f0;font-size:.75rem;text-transform:uppercase}@media print{body{padding:.5rem}}</style></head><body><h1>Odisea Tours — Rooming List</h1><p style="margin-bottom:1rem"><strong>Tour:</strong> ${tour.tourName} | <strong>Hotel:</strong> ${tour.hotelName||'—'} | <strong>Dates:</strong> ${tour.startDate||''} to ${tour.endDate||''}</p><table><thead><tr><th>Room</th><th>Passenger</th><th>Category</th><th>Dietary</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.print();
  }
};
