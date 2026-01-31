/* === PDF ITINERARY GENERATOR — Premium Travel Brochure === */
const PDFItinerary = {

  generate(tourId) {
    const t = DB.getTours().find(x => x.id === tourId);
    if (!t) { alert('Tour not found.'); return; }
    if (!t.itinerary || !t.itinerary.length) {
      alert('No itinerary data. Please add day-by-day schedule first in the Itinerary tab.');
      return;
    }

    const logo = typeof PDFQuote !== 'undefined' ? PDFQuote.LOGO_URI : '';
    const destinations = t.destinations && t.destinations.length ? t.destinations : [t.destination || ''];
    const groupSize = (t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0) + (t.numFOC||0);

    // Format helpers
    const fDate = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const fDateShort = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };
    const fTime = (time) => {
      if (!time) return '';
      const t = String(time).replace(/[^0-9]/g, '').padStart(4, '0');
      return t.slice(0,2) + ':' + t.slice(2,4);
    };

    // Build day pages
    const dayPages = t.itinerary.map((day, idx) => {
      const dayDate = day.date ? fDateShort(day.date) : `Day ${day.day}`;
      const items = (day.items || []).map(item => `
        <div class="timeline-item ${item.highlight ? 'highlight' : ''}">
          <div class="timeline-dot"></div>
          <div class="timeline-time">${fTime(item.time)}</div>
          <div class="timeline-desc">${item.description || ''}</div>
        </div>
      `).join('');

      return `
        <div class="page day-page">
          <div class="day-header">
            <div class="day-badge">${day.day}</div>
            <div class="day-info">
              <div class="day-title">${day.title || 'Day ' + day.day}</div>
              <div class="day-date">${dayDate}</div>
            </div>
          </div>
          <div class="timeline">
            ${items || '<div class="empty-day">Schedule to be confirmed</div>'}
          </div>
          <div class="page-footer">
            <div class="footer-logo"><img src="${logo}" alt="Odisea Tours" class="footer-logo-img"></div>
            <div class="footer-center">www.odisea-tours.com</div>
            <div class="footer-page">${idx + 2}</div>
          </div>
        </div>`;
    }).join('');

    // Hotels info for "What's Included"
    const hotels = t.hotels || [];
    const hotelCards = hotels.map(h => `
      <div class="hotel-card">
        <div class="hotel-stars">${'&#9733;'.repeat(h.starRating || 3)}</div>
        <div class="hotel-name">${h.hotelName || 'Hotel'}</div>
        <div class="hotel-detail">${h.city || ''} &mdash; ${h.nights || 0} night${(h.nights||0)!==1?'s':''}</div>
        <div class="hotel-meal">${h.mealPlan || 'Room Only'}</div>
      </div>
    `).join('');

    // What's included items
    const inclusions = t.inclusions || [];
    const defaultInclusions = inclusions.length ? inclusions : [
      'Return flights',
      'Airport transfers',
      'Coach transport throughout',
      'Accommodation as detailed',
      'Meals as per hotel plan',
      'All activities and entrance fees',
      'Professional tour guide',
      'Full travel insurance'
    ];

    const inclusionItems = defaultInclusions.map(item => `
      <div class="inclusion-item">
        <span class="check-icon">&#10003;</span>
        <span>${item}</span>
      </div>
    `).join('');

    const totalPages = t.itinerary.length + 2; // cover + days + final

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${t.tourName || 'Tour Itinerary'} — Odisea Tours</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page {
    size: A4;
    margin: 0;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Outfit', sans-serif;
    color: #2a2a2a;
    background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
  }

  .page:last-child {
    page-break-after: auto;
  }

  /* ===========================
     COVER PAGE
     =========================== */
  .cover-page {
    background: #111111;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 3rem 4rem;
  }

  .cover-bg-pattern {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    opacity: 0.04;
    background-image:
      radial-gradient(circle at 20% 30%, #ffb400 1px, transparent 1px),
      radial-gradient(circle at 80% 70%, #ffb400 1px, transparent 1px),
      radial-gradient(circle at 50% 50%, #ffb400 0.5px, transparent 0.5px);
    background-size: 60px 60px, 80px 80px, 40px 40px;
  }

  .cover-accent-line {
    width: 80px;
    height: 3px;
    background: #ffb400;
    margin: 0 auto;
  }

  .cover-logo {
    position: relative;
    z-index: 1;
    margin-bottom: 2.5rem;
  }

  .cover-logo img {
    height: 60px;
  }

  .cover-subtitle {
    position: relative;
    z-index: 1;
    font-family: 'Outfit', sans-serif;
    font-weight: 300;
    font-size: 11pt;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: #ffb400;
    margin-bottom: 1.2rem;
  }

  .cover-title {
    position: relative;
    z-index: 1;
    font-family: 'Cormorant Garamond', serif;
    font-weight: 700;
    font-size: 38pt;
    line-height: 1.1;
    margin-bottom: 1rem;
    color: #ffffff;
  }

  .cover-destinations {
    position: relative;
    z-index: 1;
    font-family: 'Outfit', sans-serif;
    font-weight: 400;
    font-size: 13pt;
    color: rgba(255,255,255,0.7);
    margin-bottom: 2rem;
    letter-spacing: 0.05em;
  }

  .cover-destinations span {
    color: #ffb400;
    margin: 0 0.6rem;
    font-size: 8pt;
  }

  .cover-dates {
    position: relative;
    z-index: 1;
    font-family: 'Cormorant Garamond', serif;
    font-weight: 400;
    font-style: italic;
    font-size: 15pt;
    color: rgba(255,255,255,0.85);
    margin-bottom: 0.8rem;
  }

  .cover-details-grid {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 2.5rem;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(255,255,255,0.1);
  }

  .cover-detail-item {
    text-align: center;
  }

  .cover-detail-value {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 700;
    font-size: 22pt;
    color: #ffb400;
  }

  .cover-detail-label {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(255,255,255,0.5);
    margin-top: 0.2rem;
  }

  .cover-bottom-bar {
    position: absolute;
    bottom: 0;
    left: 0; right: 0;
    height: 6px;
    background: linear-gradient(90deg, transparent, #ffb400, transparent);
  }

  /* ===========================
     DAY PAGES
     =========================== */
  .day-page {
    background: #ffffff;
    padding: 2.5rem 3rem 4rem 3rem;
    display: flex;
    flex-direction: column;
  }

  .day-header {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    margin-bottom: 2rem;
    padding-bottom: 1.2rem;
    border-bottom: 2px solid #f0f0f0;
  }

  .day-badge {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #ffb400;
    color: #111;
    font-family: 'Cormorant Garamond', serif;
    font-weight: 700;
    font-size: 26pt;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 15px rgba(255,180,0,0.3);
  }

  .day-info {
    flex: 1;
  }

  .day-title {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 700;
    font-size: 20pt;
    color: #111;
    line-height: 1.2;
  }

  .day-date {
    font-size: 9.5pt;
    color: #888;
    margin-top: 0.2rem;
    letter-spacing: 0.02em;
  }

  /* Timeline */
  .timeline {
    flex: 1;
    position: relative;
    padding-left: 2.5rem;
  }

  .timeline::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, #ffb400, #e0e0e0 30%, #e0e0e0 70%, transparent);
  }

  .timeline-item {
    position: relative;
    padding: 0.6rem 0 0.6rem 1.5rem;
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .timeline-dot {
    position: absolute;
    left: -2.5rem;
    top: 0.85rem;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #d0d0d0;
    border: 2px solid #fff;
    box-shadow: 0 0 0 2px #e0e0e0;
    z-index: 1;
  }

  .timeline-item.highlight .timeline-dot {
    background: #ffb400;
    box-shadow: 0 0 0 2px #ffb400, 0 0 10px rgba(255,180,0,0.3);
  }

  .timeline-time {
    font-family: 'Outfit', sans-serif;
    font-weight: 600;
    font-size: 10pt;
    color: #111;
    min-width: 45px;
    flex-shrink: 0;
  }

  .timeline-desc {
    font-size: 10pt;
    color: #444;
    line-height: 1.5;
    flex: 1;
  }

  .timeline-item.highlight .timeline-desc {
    font-weight: 600;
    color: #111;
    background: linear-gradient(90deg, rgba(255,180,0,0.1), transparent);
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    margin: -0.3rem -0.6rem;
  }

  .empty-day {
    text-align: center;
    color: #bbb;
    font-style: italic;
    padding: 3rem 0;
  }

  /* Page footer */
  .page-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid #f0f0f0;
    font-size: 7.5pt;
    color: #bbb;
  }

  .footer-logo-img {
    height: 22px;
    opacity: 0.5;
  }

  .footer-center {
    letter-spacing: 0.1em;
  }

  .footer-page {
    font-weight: 600;
    color: #999;
  }

  /* ===========================
     FINAL PAGE — What's Included
     =========================== */
  .final-page {
    background: #fafafa;
    padding: 3rem;
    display: flex;
    flex-direction: column;
  }

  .final-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .final-header h2 {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 700;
    font-size: 26pt;
    color: #111;
    margin-bottom: 0.5rem;
  }

  .final-header .sub {
    font-size: 10pt;
    color: #999;
    letter-spacing: 0.05em;
  }

  .inclusions-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem 2rem;
    margin-bottom: 2.5rem;
  }

  .inclusion-item {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.5rem 0;
    font-size: 10pt;
    color: #333;
    border-bottom: 1px solid #eee;
  }

  .check-icon {
    color: #ffb400;
    font-weight: 700;
    font-size: 13pt;
    flex-shrink: 0;
  }

  /* Hotels */
  .hotels-section {
    margin-bottom: 2.5rem;
  }

  .hotels-section h3 {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 600;
    font-size: 16pt;
    color: #111;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #ffb400;
    display: inline-block;
  }

  .hotel-cards {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .hotel-card {
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 1rem 1.3rem;
    min-width: 180px;
    flex: 1;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }

  .hotel-stars {
    color: #ffb400;
    font-size: 11pt;
    margin-bottom: 0.3rem;
  }

  .hotel-name {
    font-weight: 600;
    font-size: 11pt;
    color: #111;
    margin-bottom: 0.2rem;
  }

  .hotel-detail {
    font-size: 9pt;
    color: #777;
  }

  .hotel-meal {
    font-size: 8.5pt;
    color: #ffb400;
    font-weight: 500;
    margin-top: 0.3rem;
  }

  /* Contact section */
  .contact-section {
    background: #111;
    color: #fff;
    border-radius: 10px;
    padding: 1.5rem 2rem;
    text-align: center;
    margin-top: auto;
  }

  .contact-section h3 {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 600;
    font-size: 16pt;
    margin-bottom: 0.5rem;
    color: #ffb400;
  }

  .contact-details {
    display: flex;
    justify-content: center;
    gap: 2rem;
    font-size: 9.5pt;
    color: rgba(255,255,255,0.8);
    flex-wrap: wrap;
  }

  .contact-details a {
    color: #ffb400;
    text-decoration: none;
  }

  /* Print optimization */
  @media print {
    body { margin: 0; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .no-print { display: none !important; }
  }

  /* Print button */
  .print-bar {
    position: fixed;
    top: 0; left: 0; right: 0;
    background: #111;
    color: #fff;
    padding: 0.8rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 9999;
    font-family: 'Outfit', sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }

  .print-bar button {
    background: #ffb400;
    color: #111;
    border: none;
    padding: 0.5rem 1.5rem;
    font-weight: 600;
    font-size: 10pt;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Outfit', sans-serif;
  }

  .print-bar button:hover {
    background: #e6a200;
  }

  @media print {
    .print-bar { display: none; }
  }
</style>
</head>
<body>

<div class="print-bar no-print">
  <span style="font-size:10pt;opacity:0.7">Itinerary Preview — ${t.tourName}</span>
  <div style="display:flex;gap:0.8rem">
    <button onclick="window.print()">Save as PDF / Print</button>
  </div>
</div>

<!-- COVER PAGE -->
<div class="page cover-page">
  <div class="cover-bg-pattern"></div>
  <div class="cover-logo">
    <img src="${logo}" alt="Odisea Tours">
  </div>
  <div class="cover-subtitle">Bespoke Group Travel</div>
  <div class="cover-accent-line" style="margin-bottom:2rem"></div>
  <div class="cover-title">${t.tourName || 'Tour Itinerary'}</div>
  <div class="cover-destinations">
    ${destinations.map(d => d).join('<span>&#9670;</span>')}
  </div>
  <div class="cover-dates">${fDate(t.startDate)} &mdash; ${fDate(t.endDate)}</div>
  <div class="cover-details-grid">
    <div class="cover-detail-item">
      <div class="cover-detail-value">${t.nights || 0}</div>
      <div class="cover-detail-label">Nights</div>
    </div>
    <div class="cover-detail-item">
      <div class="cover-detail-value">${destinations.length}</div>
      <div class="cover-detail-label">Destinations</div>
    </div>
    <div class="cover-detail-item">
      <div class="cover-detail-value">${groupSize}</div>
      <div class="cover-detail-label">Travellers</div>
    </div>
    <div class="cover-detail-item">
      <div class="cover-detail-value">${t.itinerary.length}</div>
      <div class="cover-detail-label">Days</div>
    </div>
  </div>
  <div class="cover-bottom-bar"></div>
</div>

<!-- DAY PAGES -->
${dayPages}

<!-- WHAT'S INCLUDED PAGE -->
<div class="page final-page">
  <div class="final-header">
    <div class="cover-accent-line" style="margin-bottom:1rem"></div>
    <h2>What's Included</h2>
    <div class="sub">Everything arranged for an unforgettable experience</div>
  </div>

  <div class="inclusions-grid">
    ${inclusionItems}
  </div>

  ${hotels.length ? `
  <div class="hotels-section">
    <h3>Accommodation</h3>
    <div class="hotel-cards">
      ${hotelCards}
    </div>
  </div>
  ` : ''}

  <div class="contact-section">
    <h3>Odisea Tours</h3>
    <div class="contact-details">
      <span>juan@odisea-tours.com</span>
      <span><a href="https://www.odisea-tours.com">www.odisea-tours.com</a></span>
    </div>
  </div>

  <div class="page-footer" style="border-top:1px solid #e0e0e0;padding-top:1rem;margin-top:1.5rem">
    <div class="footer-logo"><img src="${logo}" alt="Odisea Tours" class="footer-logo-img"></div>
    <div class="footer-center">www.odisea-tours.com</div>
    <div class="footer-page">${totalPages}</div>
  </div>
</div>

</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to generate the itinerary.'); return; }
    win.document.write(html);
    win.document.close();
  }
};
