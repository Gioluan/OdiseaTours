/* === CLIENT PORTAL MODULE === */
const Portal = {
  tourId: null,
  tourData: null,
  currentSection: 'overview',
  _messageListener: null,
  _lang: sessionStorage.getItem('portal_lang') || 'en',
  _portalMode: 'tour',  // 'tour' (full access) or 'family' (scoped)
  _familyId: null,
  _familyData: null,
  _messageTab: 'announcements', // 'announcements' or 'private'
  _allMessages: [],
  _flightData: null,
  _translations: {
    en: {
      overview: 'Overview', itinerary: 'Itinerary', documents: 'Documents',
      passengers: 'Passengers', roomPlan: 'Room Plan', messages: 'Messages',
      formsConsent: 'Forms & Consent', feedback: 'Feedback', payments: 'Payments',
      signOut: 'Sign Out', daysToGo: 'days to go', departingToday: 'Departing today!',
      tourInProgress: 'Tour in progress', dates: 'Dates', duration: 'Duration',
      group: 'Group', groupSize: 'Group Size', nights: 'nights', travelers: 'travelers',
      tourOperator: 'Tour Operator', payment: 'Payment', payByCard: 'Pay by Card',
      payViaWise: 'Pay via Wise', paymentLinks: 'Use the links below to make a payment for this tour.',
      dayPlanned: 'days planned', whatsIncluded: "What's Included",
      itinBeingPrepared: 'The itinerary is being prepared. Check back soon!',
      downloadDocs: 'Download tour documents and files', noDocsYet: 'No documents uploaded yet. Check back later!',
      filesAvailable: 'files available', registerTravelers: 'Register travelers for this tour',
      registered: 'registered', ofExpected: 'of', expected: 'expected',
      addPassenger: 'Add Passenger', noPassengers: 'No passengers registered yet. Be the first to register!',
      registerPassenger: 'Register Passenger', editPassenger: 'Edit Passenger',
      firstName: 'First Name', lastName: 'Last Name', dateOfBirth: 'Date of Birth',
      nationality: 'Nationality', passportNumber: 'Passport Number', passportExpiry: 'Passport Expiry',
      role: 'Role', player: 'Player/Student', sibling: 'Sibling', adult: 'Adult/Parent',
      familyGroup: 'Family / Group Name', dietary: 'Dietary Requirements',
      medical: 'Medical Info', emergencyContact: 'Emergency Contact', save: 'Save',
      cancel: 'Cancel', remove: 'Remove', edit: 'Edit',
      enterCode: 'Enter your access code to view your tour',
      accessCode: 'ACCESS CODE', continue: 'Continue', invalidCode: 'Invalid access code. Please check and try again.',
      enterAccessCode: 'Please enter an access code.',
      firebaseError: 'Firebase not configured. Contact your tour operator.',
      yourDayByDay: 'Your day-by-day schedule',
      sendMessage: 'Send', typeMessage: 'Type a message...', noMessages: 'No messages yet. Send one to get started!',
      submitFeedback: 'Submit Feedback', feedbackThanks: 'Thank you for your feedback!',
      overallExperience: 'Overall Experience', comments: 'Comments',
      roomAssignments: 'Room assignments for your tour', noRoomPlan: 'Room plan is being prepared.',
      unassigned: 'Unassigned',
      familyTravelers: 'Your Travelers', registerFamilyTravelers: 'Register your family travelers',
      announcements: 'Announcements', privateChat: 'Private Chat',
      familyMessagesDesc: 'Group announcements and private messages',
      chatWithOperator: 'Chat with your tour operator',
      announcementsReadOnly: 'Announcements are read-only. Switch to Private Chat to send a message.',
      announcement: 'Announcement',
      flights: 'Flights', flightDetails: 'Flight Details', arrivalFlight: 'Arrival Flight',
      returnFlight: 'Return Flight', flightNumber: 'Flight Number', airline: 'Airline',
      departureAirport: 'Departure Airport', arrivalAirport: 'Arrival Airport',
      departureTime: 'Departure Time', arrivalTime: 'Arrival Time', terminal: 'Terminal',
      flightNotes: 'Notes', flightDate: 'Date', submitFlights: 'Save Flight Details',
      flightsSubmitted: 'Submitted', flightsSaved: 'Flight details saved successfully!',
      flightsNotSubmitted: 'Not yet submitted',
      checklistTitle: 'Trip Preparation', checklistDesc: 'Track your progress before departure',
      clTravelersRegistered: 'All travelers registered', clPassportDetails: 'Passport details complete',
      clFlightDetails: 'Flight details submitted', clEmergencyContacts: 'Emergency contacts provided',
      clDietaryRequirements: 'Dietary requirements noted', clPaymentComplete: 'Payment complete',
      clItemsComplete: 'items complete',
      terms: 'Terms & Conditions', termsTitle: 'Terms & Conditions',
      termsIntro: 'By booking a tour with Odisea Tours, you agree to the following terms and conditions. Please read them carefully before confirming your reservation.',
      termsBooking: 'Booking & Confirmation',
      termsBookingP1: 'A booking is confirmed once the required deposit has been received by Odisea Tours. A confirmation email with your tour details and access code will be sent upon receipt of payment.',
      termsBookingP2: 'All travelers must be registered through the client portal with accurate passport and personal details. Odisea Tours is not responsible for issues arising from incorrect information provided by the client.',
      termsPayment: 'Payment Terms',
      termsPaymentP1: 'A non-refundable deposit is required at the time of booking to secure your reservation. The deposit amount will be specified in your invoice.',
      termsPaymentP2: 'The remaining balance must be paid in full by the due date indicated on your invoice. Failure to pay by the due date may result in cancellation of your booking.',
      termsPaymentP3: 'Payments can be made via bank transfer or the payment methods provided in your client portal.',
      termsCancellation: 'Cancellation Policy',
      termsCancellationP1: 'The deposit paid at the time of booking is non-refundable under any circumstances.',
      termsCancellationP2: 'Cancellations are subject to the following refund schedule based on the number of days before the departure date. Refunds apply only to payments made beyond the non-refundable deposit:',
      termsCancellationTier1: '90 or more days before departure — 75% refund',
      termsCancellationTier2: '60 to 89 days before departure — 50% refund',
      termsCancellationTier3: '30 to 59 days before departure — 25% refund',
      termsCancellationTier4: 'Less than 30 days before departure — no refund',
      termsCancellationP3: 'All cancellation requests must be submitted in writing via email. The cancellation date is the date the written request is received by Odisea Tours.',
      termsCancellationP4: 'In the unlikely event that Odisea Tours is unable to operate a tour due to unforeseen circumstances, we will work directly with each group to find the best possible solution, which may include rebooking to alternative dates, applying credit toward a future tour, or arranging a partial or full refund at Odisea Tours\u2019 discretion.',
      termsChanges: 'Changes & Modifications',
      termsChangesP1: 'Odisea Tours reserves the right to make changes to the itinerary, accommodation, or services if necessary due to circumstances beyond our control (weather, availability, safety, etc.).',
      termsChangesP2: 'If a significant change affects the tour, clients will be notified as early as possible and offered an alternative arrangement or refund where applicable.',
      termsChangesP3: 'Client-requested changes to bookings (dates, names, services) are subject to availability and may incur additional fees.',
      termsTravel: 'Travel Requirements',
      termsTravelP1: 'It is the responsibility of each traveler to ensure they have valid travel documents (passport, visa, etc.) for the duration of the trip. Odisea Tours is not liable for denied boarding or entry due to insufficient documentation.',
      termsTravelP2: 'Odisea Tours strongly recommends that all travelers obtain comprehensive travel insurance covering cancellation, medical emergencies, luggage loss, and repatriation.',
      termsLiability: 'Liability',
      termsLiabilityP1: 'Odisea Tours acts as an organizer and intermediary between clients and third-party service providers (hotels, transport companies, activity providers). We are not liable for any injury, loss, damage, or delay caused by these third parties.',
      termsLiabilityP2: 'Odisea Tours is not responsible for events beyond our control, including but not limited to natural disasters, pandemics, strikes, political unrest, or travel restrictions imposed by governments.',
      termsConduct: 'Code of Conduct',
      termsConductP1: 'All travelers are expected to behave responsibly and respectfully throughout the tour. Odisea Tours reserves the right to remove any participant whose behavior disrupts the group or endangers others, without refund.',
      termsContact: 'Contact',
      termsContactP1: 'For any questions regarding these terms, please contact your tour operator through the messages section of your client portal or via the contact details provided in your booking confirmation.',
      termsLastUpdated: 'Last updated'
    },
    es: {
      overview: 'Resumen', itinerary: 'Itinerario', documents: 'Documentos',
      passengers: 'Pasajeros', roomPlan: 'Habitaciones', messages: 'Mensajes',
      formsConsent: 'Formularios', feedback: 'Opiniones', payments: 'Pagos',
      signOut: 'Cerrar Sesion', daysToGo: 'dias restantes', departingToday: 'Sale hoy!',
      tourInProgress: 'Tour en curso', dates: 'Fechas', duration: 'Duracion',
      group: 'Grupo', groupSize: 'Tamano del Grupo', nights: 'noches', travelers: 'viajeros',
      tourOperator: 'Operador Turistico', payment: 'Pago', payByCard: 'Pagar con Tarjeta',
      payViaWise: 'Pagar con Wise', paymentLinks: 'Usa los enlaces de abajo para realizar un pago.',
      dayPlanned: 'dias planificados', whatsIncluded: 'Que Incluye',
      itinBeingPrepared: 'El itinerario se esta preparando. Vuelve pronto!',
      downloadDocs: 'Descarga documentos del tour', noDocsYet: 'No hay documentos todavia. Vuelve mas tarde!',
      filesAvailable: 'archivos disponibles', registerTravelers: 'Registra viajeros para este tour',
      registered: 'registrados', ofExpected: 'de', expected: 'esperados',
      addPassenger: 'Agregar Pasajero', noPassengers: 'No hay pasajeros registrados. Se el primero!',
      registerPassenger: 'Registrar Pasajero', editPassenger: 'Editar Pasajero',
      firstName: 'Nombre', lastName: 'Apellido', dateOfBirth: 'Fecha de Nacimiento',
      nationality: 'Nacionalidad', passportNumber: 'Numero de Pasaporte', passportExpiry: 'Vencimiento Pasaporte',
      role: 'Rol', player: 'Jugador/Estudiante', sibling: 'Hermano/a', adult: 'Adulto/Padre',
      familyGroup: 'Familia / Grupo', dietary: 'Requisitos Dieteticos',
      medical: 'Info Medica', emergencyContact: 'Contacto de Emergencia', save: 'Guardar',
      cancel: 'Cancelar', remove: 'Eliminar', edit: 'Editar',
      enterCode: 'Ingresa tu codigo de acceso para ver tu tour',
      accessCode: 'CODIGO DE ACCESO', continue: 'Continuar', invalidCode: 'Codigo invalido. Verifica e intenta de nuevo.',
      enterAccessCode: 'Por favor ingresa un codigo de acceso.',
      firebaseError: 'Firebase no configurado. Contacta a tu operador.',
      yourDayByDay: 'Tu horario dia a dia',
      sendMessage: 'Enviar', typeMessage: 'Escribe un mensaje...', noMessages: 'No hay mensajes. Envia uno para comenzar!',
      submitFeedback: 'Enviar Opinion', feedbackThanks: 'Gracias por tu opinion!',
      overallExperience: 'Experiencia General', comments: 'Comentarios',
      roomAssignments: 'Asignacion de habitaciones', noRoomPlan: 'El plan de habitaciones se esta preparando.',
      unassigned: 'Sin asignar',
      familyTravelers: 'Tus Viajeros', registerFamilyTravelers: 'Registra los viajeros de tu familia',
      announcements: 'Anuncios', privateChat: 'Chat Privado',
      familyMessagesDesc: 'Anuncios del grupo y mensajes privados',
      chatWithOperator: 'Chatea con tu operador turistico',
      announcementsReadOnly: 'Los anuncios son de solo lectura. Cambia a Chat Privado para enviar un mensaje.',
      announcement: 'Anuncio',
      flights: 'Vuelos', flightDetails: 'Datos de Vuelo', arrivalFlight: 'Vuelo de Ida',
      returnFlight: 'Vuelo de Regreso', flightNumber: 'Numero de Vuelo', airline: 'Aerolinea',
      departureAirport: 'Aeropuerto de Salida', arrivalAirport: 'Aeropuerto de Llegada',
      departureTime: 'Hora de Salida', arrivalTime: 'Hora de Llegada', terminal: 'Terminal',
      flightNotes: 'Notas', flightDate: 'Fecha', submitFlights: 'Guardar Datos de Vuelo',
      flightsSubmitted: 'Enviado', flightsSaved: 'Datos de vuelo guardados correctamente!',
      flightsNotSubmitted: 'Pendiente de envio',
      checklistTitle: 'Preparacion del Viaje', checklistDesc: 'Controla tu progreso antes de la salida',
      clTravelersRegistered: 'Viajeros registrados', clPassportDetails: 'Datos de pasaporte completos',
      clFlightDetails: 'Datos de vuelo enviados', clEmergencyContacts: 'Contactos de emergencia',
      clDietaryRequirements: 'Requisitos dieteticos indicados', clPaymentComplete: 'Pago completado',
      clItemsComplete: 'elementos completados',
      terms: 'Terminos y Condiciones', termsTitle: 'Terminos y Condiciones',
      termsIntro: 'Al reservar un tour con Odisea Tours, aceptas los siguientes terminos y condiciones. Por favor, leelos atentamente antes de confirmar tu reserva.',
      termsBooking: 'Reserva y Confirmacion',
      termsBookingP1: 'Una reserva se confirma una vez que Odisea Tours recibe el deposito requerido. Se enviara un correo de confirmacion con los detalles del tour y el codigo de acceso al recibir el pago.',
      termsBookingP2: 'Todos los viajeros deben registrarse a traves del portal del cliente con datos de pasaporte e informacion personal correctos. Odisea Tours no se responsabiliza de problemas derivados de informacion incorrecta proporcionada por el cliente.',
      termsPayment: 'Condiciones de Pago',
      termsPaymentP1: 'Se requiere un deposito no reembolsable al momento de la reserva para asegurar tu plaza. El monto del deposito se especificara en tu factura.',
      termsPaymentP2: 'El saldo restante debe pagarse en su totalidad antes de la fecha de vencimiento indicada en tu factura. El incumplimiento del pago puede resultar en la cancelacion de tu reserva.',
      termsPaymentP3: 'Los pagos pueden realizarse mediante transferencia bancaria o los metodos de pago disponibles en tu portal del cliente.',
      termsCancellation: 'Politica de Cancelacion',
      termsCancellationP1: 'El deposito pagado al momento de la reserva no es reembolsable bajo ninguna circunstancia.',
      termsCancellationP2: 'Las cancelaciones estan sujetas al siguiente calendario de reembolsos segun los dias restantes antes de la fecha de salida. Los reembolsos aplican unicamente a los pagos realizados mas alla del deposito no reembolsable:',
      termsCancellationTier1: '90 o mas dias antes de la salida — 75% de reembolso',
      termsCancellationTier2: '60 a 89 dias antes de la salida — 50% de reembolso',
      termsCancellationTier3: '30 a 59 dias antes de la salida — 25% de reembolso',
      termsCancellationTier4: 'Menos de 30 dias antes de la salida — sin reembolso',
      termsCancellationP3: 'Todas las solicitudes de cancelacion deben enviarse por escrito via correo electronico. La fecha de cancelacion es la fecha en que Odisea Tours recibe la solicitud escrita.',
      termsCancellationP4: 'En el improbable caso de que Odisea Tours no pueda operar un tour debido a circunstancias imprevistas, trabajaremos directamente con cada grupo para encontrar la mejor soluci\u00f3n posible, que puede incluir reprogramaci\u00f3n a fechas alternativas, aplicaci\u00f3n de cr\u00e9dito para un futuro tour, o un reembolso parcial o total a discreci\u00f3n de Odisea Tours.',
      termsChanges: 'Cambios y Modificaciones',
      termsChangesP1: 'Odisea Tours se reserva el derecho de realizar cambios en el itinerario, alojamiento o servicios si es necesario debido a circunstancias fuera de nuestro control (clima, disponibilidad, seguridad, etc.).',
      termsChangesP2: 'Si un cambio significativo afecta al tour, los clientes seran notificados lo antes posible y se les ofrecera una alternativa o reembolso segun corresponda.',
      termsChangesP3: 'Los cambios solicitados por el cliente (fechas, nombres, servicios) estan sujetos a disponibilidad y pueden generar cargos adicionales.',
      termsTravel: 'Requisitos de Viaje',
      termsTravelP1: 'Es responsabilidad de cada viajero asegurarse de tener documentos de viaje validos (pasaporte, visa, etc.) durante todo el viaje. Odisea Tours no es responsable por denegacion de embarque o entrada por documentacion insuficiente.',
      termsTravelP2: 'Odisea Tours recomienda encarecidamente que todos los viajeros obtengan un seguro de viaje completo que cubra cancelacion, emergencias medicas, perdida de equipaje y repatriacion.',
      termsLiability: 'Responsabilidad',
      termsLiabilityP1: 'Odisea Tours actua como organizador e intermediario entre clientes y proveedores de servicios (hoteles, empresas de transporte, proveedores de actividades). No somos responsables de lesiones, perdidas, danos o retrasos causados por estos terceros.',
      termsLiabilityP2: 'Odisea Tours no es responsable de eventos fuera de nuestro control, incluyendo desastres naturales, pandemias, huelgas, disturbios politicos o restricciones de viaje impuestas por gobiernos.',
      termsConduct: 'Codigo de Conducta',
      termsConductP1: 'Se espera que todos los viajeros se comporten de manera responsable y respetuosa durante todo el tour. Odisea Tours se reserva el derecho de retirar a cualquier participante cuyo comportamiento interrumpa al grupo o ponga en peligro a otros, sin reembolso.',
      termsContact: 'Contacto',
      termsContactP1: 'Para cualquier pregunta sobre estos terminos, contacta a tu operador turistico a traves de la seccion de mensajes de tu portal del cliente o mediante los datos de contacto proporcionados en tu confirmacion de reserva.',
      termsLastUpdated: 'Ultima actualizacion'
    }
  },

  _t(key) {
    const lang = this._lang || 'en';
    return (this._translations[lang] && this._translations[lang][key]) || (this._translations.en[key]) || key;
  },

  toggleLanguage() {
    this._lang = this._lang === 'en' ? 'es' : 'en';
    sessionStorage.setItem('portal_lang', this._lang);
    const btn = document.getElementById('lang-toggle-btn');
    if (btn) btn.textContent = this._lang.toUpperCase();
    // Update nav drawer links
    this._updateNavLabels();
    // Re-render current section
    this.showSection(this.currentSection);
  },

  _updateNavLabels() {
    const navMap = {
      overview: 'overview', itinerary: 'itinerary', documents: 'documents',
      passengers: 'passengers', flights: 'flights', roomplan: 'roomPlan', messages: 'messages',
      forms: 'formsConsent', feedback: 'feedback', payments: 'payments', terms: 'terms'
    };
    document.querySelectorAll('.nav-drawer-links li').forEach(li => {
      const section = li.dataset.section;
      const key = navMap[section];
      if (key) {
        // Keep the SVG, just update the text node
        const textNodes = [...li.childNodes].filter(n => n.nodeType === 3);
        textNodes.forEach(n => n.textContent = '');
        // Append translated text
        const existing = li.querySelector('.nav-text');
        if (existing) existing.textContent = this._t(key);
        else {
          // Find text after SVG
          const lastText = [...li.childNodes].pop();
          if (lastText && lastText.nodeType === 3) lastText.textContent = '\n        ' + this._t(key) + '\n      ';
        }
      }
    });
    // Bottom tab bar labels
    const tabLabelMap = { overview: 'overview', passengers: 'passengers', flights: 'flights', messages: 'messages', payments: 'payments' };
    document.querySelectorAll('.bottom-tab').forEach(tab => {
      const key = tabLabelMap[tab.dataset.section];
      if (key) { const sp = tab.querySelector('span'); if (sp) sp.textContent = this._t(key); }
    });
    // Update header section title if not on overview
    if (this.currentSection !== 'overview') {
      const titleEl = document.getElementById('header-section-title');
      const sectionKeys = { itinerary: 'itinerary', documents: 'documents', passengers: 'passengers', flights: 'flights', roomplan: 'roomPlan', messages: 'messages', forms: 'formsConsent', feedback: 'feedback', payments: 'payments' };
      if (titleEl && sectionKeys[this.currentSection]) titleEl.textContent = this._t(sectionKeys[this.currentSection]);
    }
    // Sign out button
    const signOutBtn = document.querySelector('.nav-drawer-footer button');
    if (signOutBtn) signOutBtn.textContent = this._t('signOut');
    // Login screen
    const loginSubtitle = document.querySelector('.login-card .subtitle');
    if (loginSubtitle) loginSubtitle.textContent = this._t('enterCode');
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) loginBtn.textContent = this._t('continue');
    const codeInput = document.getElementById('portal-code-input');
    if (codeInput) codeInput.placeholder = this._t('accessCode');
  },

  async init() {
    // Initialize Firebase
    try {
      if (typeof firebase !== 'undefined' && FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        DB.firestore = firebase.firestore();
        DB.storage = firebase.storage();
        DB._firebaseReady = true;
        DB.firestore.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('Portal Firebase init failed:', e.message);
    }

    // Apply saved language
    const btn = document.getElementById('lang-toggle-btn');
    if (btn) btn.textContent = this._lang.toUpperCase();
    this._updateNavLabels();

    // Check URL param
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    // Check sessionStorage for existing session
    const savedCode = sessionStorage.getItem('portal_code');
    const savedTourId = sessionStorage.getItem('portal_tourId');

    if (code && code.toUpperCase() !== (savedCode || '').toUpperCase()) {
      // URL code differs from saved session — force fresh login
      sessionStorage.removeItem('portal_code');
      sessionStorage.removeItem('portal_tourId');
      sessionStorage.removeItem('portal_mode');
      sessionStorage.removeItem('portal_familyId');
      document.getElementById('portal-code-input').value = code;
      await this.handleLogin();
    } else if (savedCode && savedTourId) {
      // Restore from session
      this._portalMode = sessionStorage.getItem('portal_mode') || 'tour';
      this._familyId = sessionStorage.getItem('portal_familyId') || null;
      await this.loadTour(savedCode, savedTourId);
    } else if (code) {
      document.getElementById('portal-code-input').value = code;
      await this.handleLogin();
    }
  },

  async handleLogin(event) {
    if (event) event.preventDefault();
    const code = document.getElementById('portal-code-input').value.trim().toUpperCase();
    const errorEl = document.getElementById('portal-login-error');
    errorEl.style.display = 'none';

    if (!code) {
      errorEl.textContent = Portal._t('enterAccessCode');
      errorEl.style.display = 'block';
      return;
    }

    if (!DB._firebaseReady) {
      errorEl.textContent = Portal._t('firebaseError');
      errorEl.style.display = 'block';
      return;
    }

    // Query Firestore for tour by access code
    const tour = await DB.getTourByAccessCode(code);
    if (!tour) {
      errorEl.textContent = Portal._t('invalidCode');
      errorEl.style.display = 'block';
      return;
    }

    // Store portal mode info
    this._portalMode = tour._portalMode || 'tour';
    this._familyId = tour._familyId || null;
    sessionStorage.setItem('portal_mode', this._portalMode);
    if (this._familyId) sessionStorage.setItem('portal_familyId', this._familyId);

    await this.loadTour(code, tour.id);
  },

  async loadTour(code, tourId) {
    this.tourId = String(tourId);
    sessionStorage.setItem('portal_code', code);
    sessionStorage.setItem('portal_tourId', this.tourId);

    // Fetch tour document
    try {
      const doc = await DB.firestore.collection('tours').doc(this.tourId).get();
      if (!doc.exists) {
        this.logout();
        return;
      }
      this.tourData = { id: doc.id, ...doc.data() };
    } catch (e) {
      console.warn('Load tour failed:', e.message);
      this.logout();
      return;
    }

    // Resolve family data if in family mode
    if (this._portalMode === 'family' && this._familyId) {
      const ics = this.tourData.individualClients || [];
      this._familyData = ics.find(ic => String(ic.id) === String(this._familyId)) || null;

      // Track family access
      try {
        const famCodes = this.tourData.familyAccessCodes || {};
        if (famCodes[this._familyId]) {
          await DB.firestore.collection('tours').doc(this.tourId).update({
            [`familyAccessCodes.${this._familyId}.lastAccess`]: new Date().toISOString(),
            [`familyAccessCodes.${this._familyId}.accessCount`]: firebase.firestore.FieldValue.increment(1)
          });
        }
      } catch (_) { /* portal users may lack write access */ }
    }

    // Switch from login to main portal
    document.getElementById('portal-login').style.display = 'none';
    document.getElementById('portal-main').style.display = 'block';

    // Update drawer header
    if (this._portalMode === 'family' && this._familyData) {
      document.getElementById('drawer-tour-name').textContent = this._familyData.name || 'Your Portal';
      document.getElementById('drawer-tour-dest').textContent = (this.tourData.tourName || '') + ' — ' + (this.tourData.destination || '');
    } else {
      document.getElementById('drawer-tour-name').textContent = this.tourData.tourName || 'Tour';
      document.getElementById('drawer-tour-dest').textContent = this.tourData.destination || '';
    }

    // Update nav visibility for family mode
    this._updateNavForMode();

    this.showSection('overview');
  },

  logout() {
    sessionStorage.removeItem('portal_code');
    sessionStorage.removeItem('portal_tourId');
    sessionStorage.removeItem('portal_mode');
    sessionStorage.removeItem('portal_familyId');
    if (this._messageListener) this._messageListener();
    this.tourId = null;
    this.tourData = null;
    this._portalMode = 'tour';
    this._familyId = null;
    this._familyData = null;
    this._messageTab = 'announcements';
    this._allMessages = [];
    this._flightData = null;
    document.getElementById('portal-login').style.display = 'flex';
    document.getElementById('portal-main').style.display = 'none';
  },

  toggleDrawer() {
    document.getElementById('nav-drawer').classList.toggle('open');
    document.getElementById('nav-drawer-overlay').classList.toggle('open');
  },

  _updateNavForMode() {
    // In family mode, hide Room Plan (group-level feature), show Flights
    document.querySelectorAll('.nav-drawer-links li').forEach(li => {
      if (li.dataset.section === 'roomplan') {
        li.style.display = this._portalMode === 'family' ? 'none' : '';
      }
      if (li.dataset.section === 'flights') {
        li.style.display = this._portalMode === 'family' ? '' : 'none';
      }
    });
  },

  showSection(name) {
    this.currentSection = name;
    // Toggle active nav items
    document.querySelectorAll('.nav-drawer-links li').forEach(li => {
      li.classList.toggle('active', li.dataset.section === name);
    });
    // Toggle sections
    document.querySelectorAll('.portal-section').forEach(s => {
      s.classList.toggle('active', s.id === 'section-' + name);
    });
    // Close drawer
    document.getElementById('nav-drawer').classList.remove('open');
    document.getElementById('nav-drawer-overlay').classList.remove('open');

    // Update header: back button + section title
    const isOverview = name === 'overview';
    const backBtn = document.getElementById('header-back-btn');
    const titleEl = document.getElementById('header-section-title');
    const logoEl = document.getElementById('header-logo');
    if (backBtn) backBtn.classList.toggle('visible', !isOverview);
    if (logoEl) logoEl.style.display = isOverview ? '' : 'none';
    if (titleEl) {
      titleEl.classList.toggle('visible', !isOverview);
      const sectionNames = {
        itinerary: 'Itinerary', documents: 'Documents', passengers: 'Passengers',
        flights: 'Flights', roomplan: 'Room Plan', messages: 'Messages',
        forms: 'Forms & Consent', feedback: 'Feedback', payments: 'Payments',
        terms: 'Terms & Conditions'
      };
      titleEl.textContent = sectionNames[name] || '';
    }

    // Update bottom tab bar
    document.querySelectorAll('.bottom-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.section === name);
    });

    // Scroll to top
    window.scrollTo(0, 0);

    // Render the section
    switch (name) {
      case 'overview': this.renderOverview(); break;
      case 'itinerary': this.renderItinerary(); break;
      case 'documents': this.renderDocuments(); break;
      case 'passengers': this.renderPassengers(); break;
      case 'flights': this.renderFlights(); break;
      case 'roomplan': this.renderRoomPlan(); break;
      case 'messages': this.renderMessages(); break;
      case 'forms': this.renderForms(); break;
      case 'feedback': this.renderFeedback(); break;
      case 'payments': this.renderPaymentStatus(); break;
      case 'terms': this.renderTerms(); break;
    }
  },

  renderOverview() {
    const t = this.tourData;
    if (!t) return;
    const container = document.getElementById('section-overview');
    const isFamily = this._portalMode === 'family' && this._familyData;

    // Calculate countdown
    const start = new Date(t.startDate);
    const now = new Date();
    const diff = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
    let countdownText = '';
    if (diff > 0) countdownText = diff + ' ' + Portal._t('daysToGo');
    else if (diff === 0) countdownText = Portal._t('departingToday');
    else countdownText = Portal._t('tourInProgress');

    const groupSize = (t.numStudents || 0) + (t.numSiblings || 0) + (t.numAdults || 0) + (t.numFOC || 0);
    const familyTravelers = isFamily ? ((this._familyData.numStudents||0) + (this._familyData.numSiblings||0) + (this._familyData.numAdults||0)) : 0;

    container.innerHTML = `
      <div class="hero-card">
        ${isFamily ? `<h1>${this._familyData.name || 'Your Portal'}</h1>
        <div class="hero-dest">${t.tourName || ''} — ${t.destination || ''}</div>` : `<h1>${t.tourName || 'Your Tour'}</h1>
        <div class="hero-dest">${t.destination || ''}</div>`}
        <div class="countdown-badge">${countdownText}</div>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <div class="ic-label">${Portal._t('dates')}</div>
          <div class="ic-value">${Portal._fmtDate(t.startDate)} — ${Portal._fmtDate(t.endDate)}</div>
        </div>
        <div class="info-card">
          <div class="ic-label">${Portal._t('duration')}</div>
          <div class="ic-value">${t.nights || 0} ${Portal._t('nights')}</div>
        </div>
        ${isFamily ? `
        <div class="info-card">
          <div class="ic-label">${Portal._t('familyTravelers')}</div>
          <div class="ic-value">${familyTravelers} ${Portal._t('travelers')}</div>
        </div>
        <div class="info-card">
          <div class="ic-label">${Portal._t('group')}</div>
          <div class="ic-value">${t.groupName || t.tourName || '—'}</div>
        </div>` : `
        <div class="info-card">
          <div class="ic-label">${Portal._t('group')}</div>
          <div class="ic-value">${t.groupName || '—'}</div>
        </div>
        <div class="info-card">
          <div class="ic-label">${Portal._t('groupSize')}</div>
          <div class="ic-value">${groupSize} ${Portal._t('travelers')}</div>
        </div>`}
      </div>

      <div class="action-grid">
        <button class="action-btn" onclick="Portal.showSection('itinerary')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>${Portal._t('itinerary')}</span>
        </button>
        <button class="action-btn" onclick="Portal.showSection('documents')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>${Portal._t('documents')}</span>
        </button>
        <button class="action-btn" onclick="Portal.showSection('passengers')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <span>${Portal._t('passengers')}</span>
        </button>
        <button class="action-btn" onclick="Portal.showSection('flights')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5 5.1 3 -1.9 1.9-2.1-.5-.6.6 2.6 1.5 1.5 2.6.6-.6-.5-2.1 1.9-1.9 3 5.1.5-.3c.4-.2.6-.6.5-1.1z"/></svg>
          <span>${Portal._t('flights')}</span>
        </button>
        <button class="action-btn" onclick="Portal.showSection('roomplan')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
          <span>${Portal._t('roomPlan')}</span>
        </button>
        <button class="action-btn" onclick="Portal.showSection('messages')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span>${Portal._t('messages')}</span>
        </button>
      </div>

      <div id="overview-payment-summary"></div>

      <div id="overview-checklist"></div>

      <div class="contact-card">
        <h4>${Portal._t('tourOperator')}</h4>
        <p><strong>Odisea Tours</strong></p>
        <p>For any questions, use the Messages section or contact us directly.</p>
      </div>`;

    // Load payment summary and checklist async
    this._renderOverviewPayments();
    this._renderOverviewChecklist();
  },

  async _renderOverviewPayments() {
    const el = document.getElementById('overview-payment-summary');
    if (!el) return;
    const t = this.tourData;
    const isFamily = this._portalMode === 'family' && this._familyId;

    let invoices = [];
    try {
      if (isFamily) {
        invoices = await DB.getTourInvoicesForFamily(this.tourId, this._familyId);
      } else {
        invoices = await DB.getTourInvoices(this.tourId);
      }
    } catch (e) {}

    if (!invoices.length && !t.portalPaymentCard && !t.portalPaymentWise) return;

    const totalDue = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalPaid = invoices.reduce((s, i) => s + (i.payments || []).reduce((ps, p) => ps + Number(p.amount), 0), 0);
    const balance = totalDue - totalPaid;
    const cur = (invoices[0] && invoices[0].currency) || (t && t.currency) || 'EUR';
    const pctPaid = totalDue > 0 ? Math.min(100, Math.round(totalPaid / totalDue * 100)) : 0;

    el.innerHTML = `
      <div style="background:white;border-radius:var(--radius-lg);padding:1.2rem;margin-top:1rem;box-shadow:var(--shadow);cursor:pointer" onclick="Portal.showSection('payments')">
        <h4 style="font-family:var(--font-display);color:var(--navy);margin-bottom:0.8rem;font-size:1.05rem">${Portal._t('payment')}</h4>
        ${invoices.length ? `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.8rem;margin-bottom:0.8rem;text-align:center">
            <div><div style="font-size:0.72rem;color:var(--gray-400);text-transform:uppercase;font-weight:600">Total Due</div><div style="font-size:1.1rem;font-weight:700;color:var(--navy)">${Portal._fmtCurrency(totalDue, cur)}</div></div>
            <div><div style="font-size:0.72rem;color:var(--gray-400);text-transform:uppercase;font-weight:600">Paid</div><div style="font-size:1.1rem;font-weight:700;color:var(--green)">${Portal._fmtCurrency(totalPaid, cur)}</div></div>
            <div><div style="font-size:0.72rem;color:var(--gray-400);text-transform:uppercase;font-weight:600">Balance</div><div style="font-size:1.1rem;font-weight:700;color:${balance > 0 ? 'var(--red)' : 'var(--green)'}">${Portal._fmtCurrency(balance, cur)}</div></div>
          </div>
          <div style="background:var(--gray-100);border-radius:10px;height:8px;overflow:hidden;margin-bottom:0.5rem">
            <div style="background:${pctPaid >= 100 ? 'var(--green)' : 'var(--amber)'};height:100%;width:${pctPaid}%;border-radius:10px;transition:width 0.5s"></div>
          </div>
          <p style="text-align:center;font-size:0.78rem;color:var(--gray-400)">${pctPaid}% paid &mdash; tap for details</p>
        ` : `<p style="font-size:0.88rem;color:var(--gray-400);margin-bottom:0.8rem">${Portal._t('paymentLinks')}</p>`}
        ${(t.portalPaymentCard || t.portalPaymentWise) ? `
          <div style="display:flex;gap:0.8rem;flex-wrap:wrap;margin-top:0.8rem">
            ${t.portalPaymentCard ? `<a href="${Portal._escapeAttr(t.portalPaymentCard)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.6rem 1rem;background:var(--navy);color:white;border-radius:var(--radius-lg);text-decoration:none;font-weight:600;font-size:0.85rem">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              ${Portal._t('payByCard')}
            </a>` : ''}
            ${t.portalPaymentWise ? `<a href="${Portal._escapeAttr(t.portalPaymentWise)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.6rem 1rem;background:#9FE870;color:#163300;border-radius:var(--radius-lg);text-decoration:none;font-weight:600;font-size:0.85rem">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              ${Portal._t('payViaWise')}
            </a>` : ''}
          </div>` : ''}
      </div>`;
  },

  renderItinerary() {
    const t = this.tourData;
    if (!t) return;
    const container = document.getElementById('section-itinerary');
    const days = t.itinerary || [];

    if (!days.length) {
      container.innerHTML = `
        <div class="section-header">
          <h2>Itinerary</h2>
          <p>Your day-by-day schedule</p>
        </div>
        <div class="empty-state">
          <p>The itinerary is being prepared. Check back soon!</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="section-header">
        <h2>Itinerary</h2>
        <p>${days.length} day${days.length!==1?'s':''} planned</p>
      </div>
      ${days.map(day => `
        <div class="itin-day">
          <div class="itin-day-header">
            <div class="itin-day-num">${day.day}</div>
            <div class="itin-day-title">${day.title || 'Day ' + day.day}</div>
            <div class="itin-day-date">${Portal._fmtDate(day.date)}</div>
          </div>
          <div class="itin-day-items">
            ${(day.items || []).filter(item => item.description || item.time).map(item => `
              <div class="itin-item">
                <div class="itin-time">${item.time || ''}</div>
                <div class="itin-desc ${item.highlight ? 'highlight' : ''}">${item.description || ''}</div>
              </div>
            `).join('') || '<div class="itin-item"><div class="itin-desc" style="color:var(--gray-300)">Details coming soon</div></div>'}
          </div>
        </div>
      `).join('')}

      ${(t.inclusions && t.inclusions.length) ? `
        <div style="background:white;border-radius:var(--radius-lg);padding:1.2rem;margin-top:1rem;box-shadow:var(--shadow)">
          <h3 style="font-family:var(--font-display);color:var(--navy);margin-bottom:0.8rem;font-size:1.05rem">What's Included</h3>
          ${t.inclusions.map(item => `
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0;font-size:0.88rem;color:var(--gray-600)">
              <span style="color:var(--green);font-weight:700">&#10003;</span> ${item}
            </div>
          `).join('')}
        </div>` : ''}`;
  },

  async renderDocuments() {
    const container = document.getElementById('section-documents');
    container.innerHTML = `
      <div class="section-header">
        <h2>Documents</h2>
        <p>Download tour documents and files</p>
      </div>
      <div style="text-align:center;padding:2rem"><div class="spinner"></div></div>`;

    const docs = await DB.getTourDocuments(this.tourId);

    if (!docs.length) {
      container.innerHTML = `
        <div class="section-header">
          <h2>Documents</h2>
          <p>Download tour documents and files</p>
        </div>
        <div class="empty-state">
          <p>No documents uploaded yet. Check back later!</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="section-header">
        <h2>Documents</h2>
        <p>${docs.length} file${docs.length!==1?'s':''} available</p>
      </div>
      ${docs.map(doc => {
        const ext = (doc.name || '').split('.').pop().toLowerCase();
        const icon = { pdf: '\uD83D\uDCC4', doc: '\uD83D\uDCC3', docx: '\uD83D\uDCC3', xls: '\uD83D\uDCCA', xlsx: '\uD83D\uDCCA', jpg: '\uD83D\uDDBC', jpeg: '\uD83D\uDDBC', png: '\uD83D\uDDBC' }[ext] || '\uD83D\uDCC1';
        const size = doc.size ? (doc.size < 1024*1024 ? Math.round(doc.size/1024) + ' KB' : (doc.size/(1024*1024)).toFixed(1) + ' MB') : '';
        return `
          <div class="doc-item">
            <div class="doc-icon">${icon}</div>
            <div class="doc-info">
              <div class="doc-name">${doc.name}</div>
              <div class="doc-meta">${size}${doc.uploadedAt ? ' \u2022 ' + Portal._fmtDate(doc.uploadedAt) : ''}</div>
            </div>
            <a href="${doc.url}" target="_blank" class="doc-download" rel="noopener">Download</a>
          </div>`;
      }).join('')}`;
  },

  _passengers: [],
  _invoices: [],

  async renderPassengers() {
    const container = document.getElementById('section-passengers');
    const isFamily = this._portalMode === 'family' && this._familyData;
    container.innerHTML = `
      <div class="section-header">
        <h2>${Portal._t('passengers')}</h2>
        <p>${isFamily ? Portal._t('registerFamilyTravelers') : Portal._t('registerTravelers')}</p>
      </div>
      <div style="text-align:center;padding:2rem"><div class="spinner"></div></div>`;

    // Load passengers and invoices in parallel
    const [allPassengers, invoices] = await Promise.all([
      DB.getTourPassengers(this.tourId),
      isFamily ? DB.getTourInvoicesForFamily(this.tourId, this._familyId) : DB.getTourInvoices(this.tourId)
    ]);
    this._passengers = allPassengers;
    this._invoices = invoices;

    // Filter passengers for family mode
    let passengers = allPassengers;
    if (isFamily) {
      const familyName = (this._familyData.name || '').toLowerCase().trim();
      passengers = allPassengers.filter(p => {
        if (p.familyId && String(p.familyId) === String(this._familyId)) return true;
        if (p.family && familyName && p.family.toLowerCase().trim() === familyName) return true;
        return false;
      });
    }

    const t = this.tourData;
    const totalExpected = isFamily
      ? ((this._familyData.numStudents || 0) + (this._familyData.numSiblings || 0) + (this._familyData.numAdults || 0))
      : ((t.numStudents || 0) + (t.numSiblings || 0) + (t.numAdults || 0) + (t.numFOC || 0));

    let html = `
      <div class="section-header">
        <h2>${Portal._t('passengers')}</h2>
        <p>${passengers.length} ${Portal._t('registered')}${totalExpected ? ' ' + Portal._t('ofExpected') + ' ' + totalExpected + ' ' + Portal._t('expected') : ''}</p>
      </div>

      ${totalExpected ? `<div class="pax-progress-bar">
        <div class="pax-progress-fill" style="width:${Math.min(100, Math.round(passengers.length / totalExpected * 100))}%"></div>
        <span class="pax-progress-label">${Math.round(passengers.length / totalExpected * 100)}%</span>
      </div>` : ''}

      <button class="add-pax-btn" onclick="Portal.showPassengerForm()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:2px"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        ${Portal._t('addPassenger')}
      </button>
      <div id="pax-form-container"></div>`;

    this._selectedPax = new Set();

    if (passengers.length) {
      html += `
        <div id="pax-select-toolbar" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.82rem;font-weight:600;color:var(--gray-500)">
            <input type="checkbox" id="pax-select-all" onchange="Portal.toggleSelectAll(this.checked)" style="width:16px;height:16px;accent-color:var(--navy)">
            Select All (${passengers.length})
          </label>
          <button id="pax-delete-selected-btn" class="btn-outline btn-sm" style="border-color:var(--red);color:var(--red);display:none;margin-left:auto" onclick="Portal.showDeleteSelectedWarning()">
            Delete Selected (<span id="pax-selected-count">0</span>)
          </button>
        </div>
        <div id="pax-delete-warning" style="display:none"></div>`;
      html += `<div class="pax-list">`;
      html += passengers.map(p => {
        const initials = ((p.firstName || '')[0] || '') + ((p.lastName || '')[0] || '');
        const fullName = (p.firstName || '') + ' ' + (p.lastName || '');

        // Try to match passenger to an individual client invoice by name
        const paymentStatus = this._getPaymentStatus(fullName);

        // Passport status
        let passportTag = '';
        if (p.passportNumber) {
          if (p.passportExpiry) {
            const exp = new Date(p.passportExpiry);
            const monthsLeft = (exp - new Date()) / (1000*60*60*24*30);
            if (monthsLeft < 0) passportTag = '<span class="pax-tag pax-tag-red">Expired</span>';
            else if (monthsLeft < 6) passportTag = '<span class="pax-tag pax-tag-amber">Expiring Soon</span>';
            else passportTag = '<span class="pax-tag pax-tag-green">Valid</span>';
          } else {
            passportTag = '<span class="pax-tag pax-tag-gray">No Expiry</span>';
          }
        } else {
          passportTag = '<span class="pax-tag pax-tag-red">No Passport</span>';
        }

        return `
          <div class="pax-card-detail" onclick="Portal.togglePaxDetail('pax-${p.id}')">
            <div class="pax-card-main">
              <input type="checkbox" class="pax-select-cb" data-pax-id="${p.id}" onclick="event.stopPropagation();Portal.togglePaxSelect('${p.id}',this.checked)" style="width:16px;height:16px;accent-color:var(--navy);flex-shrink:0;cursor:pointer">
              <div class="pax-avatar">${initials.toUpperCase() || '?'}</div>
              <div class="pax-info">
                <div class="pax-name">${fullName}</div>
                <div class="pax-detail">
                  ${p.nationality || 'No nationality'}${p.dateOfBirth ? ' &bull; ' + Portal._fmtDate(p.dateOfBirth) : ''}
                </div>
                <div class="pax-tags">
                  ${p.role ? '<span class="pax-tag pax-tag-role-' + p.role.toLowerCase() + '">' + Portal._escapeHtml(p.role) + '</span>' : ''}
                  ${p.family ? '<span class="pax-tag pax-tag-family">' + Portal._escapeHtml(p.family) + '</span>' : ''}
                  ${paymentStatus}
                  ${passportTag}
                  ${p.dietary ? '<span class="pax-tag pax-tag-blue">' + Portal._escapeHtml(p.dietary) + '</span>' : ''}
                  ${p.medical ? '<span class="pax-tag pax-tag-amber">Medical Note</span>' : ''}
                </div>
              </div>
              <div class="pax-chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <div class="pax-detail-panel" id="pax-${p.id}" style="display:none" onclick="event.stopPropagation()">
              <div class="pax-detail-grid">
                <div class="pax-field"><span class="pax-field-label">Full Name</span><span class="pax-field-value">${fullName}</span></div>
                <div class="pax-field"><span class="pax-field-label">Role</span><span class="pax-field-value">${p.role || '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Family / Group</span><span class="pax-field-value">${p.family || '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Date of Birth</span><span class="pax-field-value">${p.dateOfBirth ? Portal._fmtDate(p.dateOfBirth) : '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Nationality</span><span class="pax-field-value">${p.nationality || '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Passport</span><span class="pax-field-value">${p.passportNumber || '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Passport Expiry</span><span class="pax-field-value">${p.passportExpiry ? Portal._fmtDate(p.passportExpiry) : '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Dietary</span><span class="pax-field-value">${p.dietary || '\u2014'}</span></div>
                <div class="pax-field full-width"><span class="pax-field-label">Medical Info</span><span class="pax-field-value">${p.medical || '\u2014'}</span></div>
                <div class="pax-field full-width"><span class="pax-field-label">Emergency Contact</span><span class="pax-field-value">${p.emergencyContact || '\u2014'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Room</span><span class="pax-field-value">${p.room || 'Unassigned'}</span></div>
                <div class="pax-field"><span class="pax-field-label">Registered</span><span class="pax-field-value">${p.createdAt ? Portal._fmtDate(p.createdAt) : '\u2014'}</span></div>
              </div>
              <div class="pax-detail-actions">
                <button class="btn-primary btn-sm" onclick="event.stopPropagation();Portal.showPassengerForm('${p.id}')">Edit</button>
                <button class="btn-outline btn-sm" style="border-color:var(--red);color:var(--red)" onclick="event.stopPropagation();Portal.deletePassenger('${p.id}')">Remove</button>
              </div>
            </div>
          </div>`;
      }).join('');
      html += `</div>`;
    } else {
      html += '<div class="empty-state"><p>No passengers registered yet. Be the first to register!</p></div>';
    }

    container.innerHTML = html;
  },

  _getPaymentStatus(fullName) {
    const t = this.tourData;
    if (!t || !t.individualClients) return '<span class="pax-tag pax-tag-gray">No Invoice</span>';

    // Try to match by name (fuzzy: check if passenger name contains individual client name or vice versa)
    const nameLower = fullName.toLowerCase().trim();
    const ic = t.individualClients.find(c => {
      const icName = (c.name || '').toLowerCase().trim();
      return icName && (nameLower.includes(icName) || icName.includes(nameLower));
    });

    if (!ic) return '<span class="pax-tag pax-tag-gray">No Invoice</span>';

    // Find matching invoice
    const inv = this._invoices.find(i => i.individualClientRef === ic.id && i.tourId === t.id);
    if (!inv) return '<span class="pax-tag pax-tag-gray">No Invoice</span>';

    const paid = (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const amount = Number(inv.amount) || 0;
    if (paid >= amount) return '<span class="pax-tag pax-tag-green">Paid</span>';
    if (paid > 0) return '<span class="pax-tag pax-tag-amber">Partial (' + Math.round(paid/amount*100) + '%)</span>';
    return '<span class="pax-tag pax-tag-red">Unpaid</span>';
  },

  togglePaxDetail(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOpen = el.style.display !== 'none';
    // Close all others
    document.querySelectorAll('.pax-detail-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.pax-card-detail').forEach(c => c.classList.remove('expanded'));
    if (!isOpen) {
      el.style.display = 'block';
      el.closest('.pax-card-detail').classList.add('expanded');
    }
  },

  showPassengerForm(editId) {
    const formContainer = document.getElementById('pax-form-container');
    if (!formContainer) return;

    // If editing, find existing passenger data
    let p = {};
    if (editId) {
      p = this._passengers.find(x => x.id === editId) || {};
    }

    const isEdit = !!editId;

    // Get unique family names for datalist
    const families = [...new Set(this._passengers.map(x => x.family).filter(Boolean))];

    formContainer.innerHTML = `
      <form class="pax-form" onsubmit="Portal.savePassenger(event, '${editId || ''}')">
        <h3>${isEdit ? 'Edit Passenger' : 'Register Passenger'}</h3>
        <div class="form-row form-row-2">
          <div class="form-group"><label>First Name *</label><input id="pf-first" required value="${Portal._escapeAttr(p.firstName || '')}"></div>
          <div class="form-group"><label>Last Name *</label><input id="pf-last" required value="${Portal._escapeAttr(p.lastName || '')}"></div>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label>Role *</label>
            <select id="pf-role">
              <option value="Player" ${(p.role||'')==='Player'?'selected':''}>Player</option>
              <option value="Sibling" ${(p.role||'')==='Sibling'?'selected':''}>Sibling</option>
              <option value="Adult" ${(p.role||'')==='Adult'?'selected':''}>Adult</option>
              <option value="Coach" ${(p.role||'')==='Coach'?'selected':''}>Coach</option>
            </select>
          </div>
          <div class="form-group">
            <label>${Portal._t('familyGroup')}</label>
            ${(this._portalMode === 'family' && this._familyData)
              ? `<input id="pf-family" value="${Portal._escapeAttr(this._familyData.name || p.family || '')}" readonly style="background:var(--gray-50);color:var(--gray-400)">`
              : `<input id="pf-family" list="family-list" placeholder="e.g. Smith Family" value="${Portal._escapeAttr(p.family || '')}">
            <datalist id="family-list">${families.map(f => '<option value="' + Portal._escapeAttr(f) + '">').join('')}</datalist>`}
          </div>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group"><label>Date of Birth</label><input id="pf-dob" type="date" value="${p.dateOfBirth || ''}"></div>
          <div class="form-group"><label>Nationality</label><input id="pf-nationality" placeholder="e.g. British" value="${Portal._escapeAttr(p.nationality || '')}"></div>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group"><label>Passport Number</label><input id="pf-passport" value="${Portal._escapeAttr(p.passportNumber || '')}"></div>
          <div class="form-group"><label>Passport Expiry</label><input id="pf-passport-exp" type="date" value="${p.passportExpiry || ''}"></div>
        </div>
        <div class="form-group"><label>Dietary Requirements</label><input id="pf-dietary" placeholder="e.g. Vegetarian, Gluten-free" value="${Portal._escapeAttr(p.dietary || '')}"></div>
        <div class="form-group"><label>Medical Information</label><textarea id="pf-medical" rows="2" placeholder="Allergies, medications, conditions...">${Portal._escapeHtml(p.medical || '')}</textarea></div>
        <div class="form-group"><label>Emergency Contact</label><input id="pf-emergency" placeholder="Name and phone number" value="${Portal._escapeAttr(p.emergencyContact || '')}"></div>
        <div class="pax-form-actions">
          <button type="submit" class="btn-primary">${isEdit ? 'Update Passenger' : 'Save Passenger'}</button>
          <button type="button" class="btn-outline" onclick="document.getElementById('pax-form-container').innerHTML=''">Cancel</button>
        </div>
      </form>`;
    formContainer.scrollIntoView({ behavior: 'smooth' });
  },

  async savePassenger(event, editId) {
    event.preventDefault();

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const cancelBtn = event.target.querySelector('button[type="button"]');
    const origLabel = editId ? 'Update Passenger' : 'Save Passenger';

    // Disable entire form while saving
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }
    if (cancelBtn) cancelBtn.disabled = true;

    try {
      const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };
      const passenger = {
        firstName: val('pf-first').trim(),
        lastName: val('pf-last').trim(),
        role: val('pf-role'),
        family: val('pf-family').trim(),
        dateOfBirth: val('pf-dob'),
        nationality: val('pf-nationality').trim(),
        passportNumber: val('pf-passport').trim(),
        passportExpiry: val('pf-passport-exp'),
        dietary: val('pf-dietary').trim(),
        medical: val('pf-medical').trim(),
        emergencyContact: val('pf-emergency').trim(),
        source: 'portal'
      };

      if (this._portalMode === 'family' && this._familyId) {
        passenger.familyId = this._familyId;
      }

      if (!passenger.firstName || !passenger.lastName) {
        alert('First and last name are required.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origLabel; }
        if (cancelBtn) cancelBtn.disabled = false;
        return;
      }

      let result;
      if (editId) {
        result = await DB.updateTourPassenger(this.tourId, editId, passenger);
      } else {
        result = await DB.saveTourPassenger(this.tourId, passenger);
      }

      if (result) {
        // Show success toast
        this._showToast(editId ? 'Passenger updated!' : 'Passenger saved!');
        const savedId = result.id;
        await this.renderPassengers();
        // Scroll to and highlight the saved passenger
        if (savedId) {
          const el = document.getElementById('pax-' + savedId);
          if (el) {
            const card = el.closest('.pax-card-detail');
            if (card) {
              card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              card.style.outline = '2px solid var(--green)';
              card.style.outlineOffset = '2px';
              setTimeout(() => { card.style.outline = ''; card.style.outlineOffset = ''; }, 2000);
            }
          }
        }
      } else {
        alert('Failed to save passenger. Please check your connection and try again.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origLabel; }
        if (cancelBtn) cancelBtn.disabled = false;
      }
    } catch (err) {
      console.error('savePassenger error:', err);
      alert('Error saving passenger: ' + (err.message || 'Unknown error'));
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origLabel; }
      if (cancelBtn) cancelBtn.disabled = false;
    }
  },

  async deletePassenger(passengerId) {
    const p = this._passengers.find(x => x.id === passengerId);
    const name = p ? (p.firstName + ' ' + p.lastName).trim() : 'this passenger';
    if (!confirm('Remove ' + name + '? This cannot be undone.')) return;

    // Show loading on the delete button
    const btn = event && event.target ? event.target : null;
    if (btn) { btn.disabled = true; btn.textContent = 'Removing...'; }

    try {
      const result = await DB.deleteTourPassenger(this.tourId, passengerId);
      if (result) {
        this._showToast(name + ' removed');
        this.renderPassengers();
      } else {
        alert('Failed to remove passenger. Please try again.');
        if (btn) { btn.disabled = false; btn.textContent = 'Remove'; }
      }
    } catch (err) {
      alert('Error removing passenger: ' + (err.message || 'Unknown error'));
      if (btn) { btn.disabled = false; btn.textContent = 'Remove'; }
    }
  },

  _selectedPax: new Set(),

  toggleSelectAll(checked) {
    document.querySelectorAll('.pax-select-cb').forEach(cb => { cb.checked = checked; });
    this._selectedPax.clear();
    if (checked) {
      const isFamily = this._portalMode === 'family' && this._familyData;
      let passengers = this._passengers;
      if (isFamily) {
        const familyName = (this._familyData.name || '').toLowerCase().trim();
        passengers = passengers.filter(p =>
          (p.familyId && String(p.familyId) === String(this._familyId)) ||
          (p.family && familyName && p.family.toLowerCase().trim() === familyName)
        );
      }
      passengers.forEach(p => this._selectedPax.add(p.id));
    }
    this._updateSelectUI();
  },

  togglePaxSelect(id, checked) {
    if (checked) this._selectedPax.add(id);
    else this._selectedPax.delete(id);
    // Update "Select All" checkbox state
    const allCbs = document.querySelectorAll('.pax-select-cb');
    const selectAllCb = document.getElementById('pax-select-all');
    if (selectAllCb) selectAllCb.checked = allCbs.length > 0 && [...allCbs].every(cb => cb.checked);
    this._updateSelectUI();
  },

  _updateSelectUI() {
    const count = this._selectedPax.size;
    const btn = document.getElementById('pax-delete-selected-btn');
    const countEl = document.getElementById('pax-selected-count');
    if (btn) btn.style.display = count > 0 ? '' : 'none';
    if (countEl) countEl.textContent = count;
    // Hide warning if deselected everything
    if (count === 0) {
      const warning = document.getElementById('pax-delete-warning');
      if (warning) warning.style.display = 'none';
    }
  },

  showDeleteSelectedWarning() {
    const count = this._selectedPax.size;
    if (!count) return;
    const warning = document.getElementById('pax-delete-warning');
    if (!warning) return;
    warning.style.display = 'block';
    warning.innerHTML = `
      <div style="background:#FEF2F2;border:2px solid var(--red);border-radius:var(--radius-lg);padding:1.2rem;margin-bottom:1rem">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <strong style="color:var(--red);font-size:1rem">Delete ${count} passenger${count !== 1 ? 's' : ''}?</strong>
        </div>
        <p style="font-size:0.85rem;color:var(--gray-600);margin-bottom:1rem">This action <strong>cannot be undone</strong>. All selected passenger records will be permanently removed.</p>
        <div style="display:flex;gap:0.5rem">
          <button class="btn-outline btn-sm" style="border-color:var(--gray-300);color:var(--gray-500)" onclick="document.getElementById('pax-delete-warning').style.display='none'">Cancel</button>
          <button id="pax-confirm-delete-btn" class="btn-sm" style="background:var(--red);color:white;border:none;padding:0.4rem 1rem;border-radius:var(--radius);font-weight:600;cursor:pointer" onclick="Portal.deleteSelectedPassengers()">Yes, delete ${count} passenger${count !== 1 ? 's' : ''}</button>
        </div>
      </div>`;
    warning.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  async deleteSelectedPassengers() {
    const ids = [...this._selectedPax];
    if (!ids.length) return;

    const btn = document.getElementById('pax-confirm-delete-btn');
    const cancelBtn = btn ? btn.previousElementSibling : null;
    if (btn) { btn.disabled = true; btn.textContent = 'Deleting... 0/' + ids.length; }
    if (cancelBtn) cancelBtn.style.display = 'none';

    let deleted = 0;
    let failed = 0;
    let lastError = '';
    for (let i = 0; i < ids.length; i++) {
      try {
        const result = await DB.deleteTourPassenger(this.tourId, ids[i]);
        if (result) deleted++;
        else { failed++; lastError = 'Permission denied or not found'; }
      } catch (e) {
        failed++;
        lastError = e.message || 'Unknown error';
        console.error('Delete failed for', ids[i], e);
      }
      if (btn) btn.textContent = 'Deleting... ' + (i + 1) + '/' + ids.length;
    }

    this._selectedPax.clear();

    if (failed > 0 && deleted === 0) {
      alert('Failed to delete passengers. Error: ' + lastError + '\n\nPlease check your connection and try again.');
      if (btn) { btn.disabled = false; btn.textContent = 'Retry'; }
      if (cancelBtn) cancelBtn.style.display = '';
    } else {
      this._showToast(deleted + ' passenger' + (deleted !== 1 ? 's' : '') + ' deleted' + (failed ? ' (' + failed + ' failed)' : ''));
      this.renderPassengers();
    }
  },

  _showToast(message) {
    let toast = document.getElementById('portal-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'portal-toast';
      toast.style.cssText = 'position:fixed;bottom:5rem;left:50%;transform:translateX(-50%);background:var(--navy);color:white;padding:0.6rem 1.2rem;border-radius:var(--radius-lg);font-size:0.88rem;font-weight:600;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;box-shadow:var(--shadow-lg)';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  },

  /* ============================================================
     ROOM PLAN — assign passengers to rooms + download
     ============================================================ */
  _roomPlan: [],

  _roomTypeLabel(count) {
    if (count === 1) return 'Single Room';
    if (count === 2) return 'Twin Room';
    if (count === 3) return 'Triple Room';
    if (count === 4) return 'Quadruple Room';
    return count + '-Person Room';
  },

  async renderRoomPlan() {
    const container = document.getElementById('section-roomplan');
    container.innerHTML = `
      <div class="section-header">
        <h2>Room Plan</h2>
        <p>Assign passengers to rooms for hotel bookings</p>
      </div>
      <div style="text-align:center;padding:2rem"><div class="spinner"></div></div>`;

    // Load passengers if not loaded
    if (!this._passengers.length) {
      this._passengers = await DB.getTourPassengers(this.tourId);
    }

    // Load room plan from tour doc
    this._roomPlan = this.tourData.roomPlan || [];

    const passengers = this._passengers;
    const assigned = new Set();
    this._roomPlan.forEach(room => (room.passengers || []).forEach(id => assigned.add(id)));
    const unassigned = passengers.filter(p => !assigned.has(p.id));

    // Group unassigned by family
    const familyGroups = {};
    const noFamily = [];
    unassigned.forEach(p => {
      if (p.family) {
        if (!familyGroups[p.family]) familyGroups[p.family] = [];
        familyGroups[p.family].push(p);
      } else {
        noFamily.push(p);
      }
    });

    container.innerHTML = `
      <div class="section-header">
        <h2>Room Plan</h2>
        <p>${this._roomPlan.length} room${this._roomPlan.length!==1?'s':''} &bull; ${passengers.length - unassigned.length} assigned &bull; ${unassigned.length} unassigned</p>
      </div>

      <div class="rp-actions">
        <button class="btn-primary btn-sm" onclick="Portal.addRoom()">+ Add Room</button>
        <button class="btn-outline btn-sm" onclick="Portal.autoAssignRooms()">Auto-Assign</button>
        ${this._roomPlan.length ? '<button class="btn-outline btn-sm" onclick="Portal.downloadRoomPlan()">Download PDF</button><button class="btn-outline btn-sm" onclick="Portal.downloadRoomPlanExcel()">Download CSV</button>' : ''}
      </div>

      ${this._roomPlan.length ? `<div class="rp-rooms">
        ${this._roomPlan.map((room, ri) => {
          const roomPax = (room.passengers || []).map(id => passengers.find(p => p.id === id)).filter(Boolean);
          return `
            <div class="rp-room">
              <div class="rp-room-header">
                <div class="rp-room-num">
                  <input value="${Portal._escapeAttr(room.name || 'Room ' + (ri+1))}" class="rp-room-name-input" onchange="Portal.updateRoomName(${ri},this.value)" onclick="event.stopPropagation()">
                </div>
                <span class="rp-room-type">${Portal._roomTypeLabel(roomPax.length)}</span>
                <span class="rp-room-count">${roomPax.length} guest${roomPax.length!==1?'s':''}</span>
                <button class="rp-room-delete" onclick="Portal.removeRoom(${ri})" title="Remove room">&times;</button>
              </div>
              <div class="rp-room-guests">
                ${roomPax.length ? roomPax.map(p => `
                  <div class="rp-guest">
                    <div class="rp-guest-avatar">${((p.firstName||'')[0]||'')+((p.lastName||'')[0]||'')}</div>
                    <div class="rp-guest-info">
                      <div class="rp-guest-name">${p.firstName||''} ${p.lastName||''}</div>
                      <div class="rp-guest-meta">${p.role||''}${p.family?' &bull; '+Portal._escapeHtml(p.family):''}</div>
                    </div>
                    <button class="rp-guest-remove" onclick="Portal.removeFromRoom(${ri},'${p.id}')" title="Remove from room">&times;</button>
                  </div>
                `).join('') : '<div class="rp-empty">No guests assigned</div>'}
              </div>
              <div class="rp-room-add">
                <select onchange="Portal.assignToRoom(${ri},this.value);this.value=''" class="rp-assign-select">
                  <option value="">+ Add guest...</option>
                  ${unassigned.map(p => '<option value="' + p.id + '">' + Portal._escapeAttr((p.firstName||'')+' '+(p.lastName||'')) + (p.family?' ('+Portal._escapeAttr(p.family)+')':'') + (p.role?' - '+p.role:'') + '</option>').join('')}
                </select>
              </div>
            </div>`;
        }).join('')}
      </div>` : ''}

      <div style="background:var(--gray-50);border:1.5px solid var(--gray-200);border-radius:var(--radius-lg);padding:0.8rem 1rem;margin-bottom:1rem;display:flex;gap:0.6rem;align-items:flex-start">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p style="font-size:0.82rem;color:var(--gray-500);line-height:1.5;margin:0">Odisea Tours will do its best to accommodate the group as required, however final room arrangements depend on hotel characteristics and availability at the time of booking.</p>
      </div>

      ${unassigned.length ? `
        <div class="rp-unassigned">
          <h3 class="rp-unassigned-title">Unassigned Passengers (${unassigned.length})</h3>
          ${Object.keys(familyGroups).length ? Object.entries(familyGroups).map(([family, members]) => `
            <div class="rp-family-group">
              <div class="rp-family-label">${Portal._escapeHtml(family)} (${members.length})</div>
              <div class="rp-family-members">
                ${members.map(p => `
                  <div class="rp-unassigned-pax">
                    <span class="rp-ua-name">${p.firstName||''} ${p.lastName||''}</span>
                    <span class="pax-tag pax-tag-role-${(p.role||'player').toLowerCase()}">${p.role||'Player'}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('') : ''}
          ${noFamily.length ? `
            <div class="rp-family-group">
              <div class="rp-family-label">No Family Group (${noFamily.length})</div>
              <div class="rp-family-members">
                ${noFamily.map(p => `
                  <div class="rp-unassigned-pax">
                    <span class="rp-ua-name">${p.firstName||''} ${p.lastName||''}</span>
                    <span class="pax-tag pax-tag-role-${(p.role||'player').toLowerCase()}">${p.role||'Player'}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}`;
  },

  addRoom() {
    this._roomPlan.push({ name: 'Room ' + (this._roomPlan.length + 1), passengers: [] });
    this._saveRoomPlan();
  },

  removeRoom(idx) {
    if (!confirm('Remove this room? Guests will become unassigned.')) return;
    this._roomPlan.splice(idx, 1);
    this._saveRoomPlan();
  },

  updateRoomName(idx, name) {
    if (this._roomPlan[idx]) this._roomPlan[idx].name = name;
    this._saveRoomPlan(false);
  },

  assignToRoom(roomIdx, passengerId) {
    if (!passengerId || !this._roomPlan[roomIdx]) return;
    // Remove from any other room first
    this._roomPlan.forEach(r => { r.passengers = (r.passengers || []).filter(id => id !== passengerId); });
    this._roomPlan[roomIdx].passengers.push(passengerId);
    this._saveRoomPlan();
  },

  removeFromRoom(roomIdx, passengerId) {
    if (!this._roomPlan[roomIdx]) return;
    this._roomPlan[roomIdx].passengers = (this._roomPlan[roomIdx].passengers || []).filter(id => id !== passengerId);
    this._saveRoomPlan();
  },

  autoAssignRooms() {
    const passengers = this._passengers;
    if (!passengers.length) return;

    // Group by family first, then solo passengers
    const familyGroups = {};
    const solos = [];
    passengers.forEach(p => {
      if (p.family) {
        if (!familyGroups[p.family]) familyGroups[p.family] = [];
        familyGroups[p.family].push(p.id);
      } else {
        solos.push(p.id);
      }
    });

    this._roomPlan = [];
    let roomNum = 1;

    // Each family gets a room
    Object.entries(familyGroups).forEach(([family, ids]) => {
      this._roomPlan.push({ name: family, passengers: ids });
      roomNum++;
    });

    // Solo passengers: group by role, 2-3 per room
    const roleGroups = {};
    solos.forEach(id => {
      const p = passengers.find(x => x.id === id);
      const role = (p && p.role) || 'Player';
      if (!roleGroups[role]) roleGroups[role] = [];
      roleGroups[role].push(id);
    });

    Object.entries(roleGroups).forEach(([role, ids]) => {
      for (let i = 0; i < ids.length; i += 2) {
        const chunk = ids.slice(i, i + 2);
        this._roomPlan.push({ name: 'Room ' + roomNum, passengers: chunk });
        roomNum++;
      }
    });

    this._saveRoomPlan();
  },

  async _saveRoomPlan(rerender) {
    this.tourData.roomPlan = this._roomPlan;
    if (DB._firebaseReady) {
      try {
        await DB.firestore.collection('tours').doc(this.tourId).update({ roomPlan: this._roomPlan });
      } catch (e) {
        console.warn('Save room plan failed:', e.message);
      }
    }
    if (rerender !== false) this.renderRoomPlan();
  },

  downloadRoomPlan() {
    const t = this.tourData;
    const passengers = this._passengers;
    const rooms = this._roomPlan;

    // Build HTML document for printing/saving
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Room Plan - ${Portal._escapeHtml(t.tourName || 'Tour')}</title>
      <style>
        body{font-family:'Segoe UI',Arial,sans-serif;margin:2rem;color:#333;font-size:14px}
        h1{color:#111111;border-bottom:3px solid #ffb400;padding-bottom:0.5rem;margin-bottom:0.3rem;font-size:1.5rem}
        .subtitle{color:#888;margin-bottom:1.5rem;font-size:0.9rem}
        .room{border:1px solid #ddd;border-radius:8px;margin-bottom:1rem;overflow:hidden;page-break-inside:avoid}
        .room-header{background:#111111;color:white;padding:0.6rem 1rem;font-weight:600;display:flex;justify-content:space-between}
        .room-body{padding:0.8rem 1rem}
        .guest{display:flex;align-items:center;gap:0.8rem;padding:0.4rem 0;border-bottom:1px solid #f0f0f0}
        .guest:last-child{border-bottom:none}
        .guest-name{font-weight:600;min-width:180px}
        .guest-detail{color:#888;font-size:0.85rem}
        .tag{display:inline-block;padding:0.1rem 0.5rem;border-radius:10px;font-size:0.75rem;font-weight:600}
        .tag-player{background:#e8f5e9;color:#2e7d32}
        .tag-sibling{background:#e3f2fd;color:#1565c0}
        .tag-adult{background:#fce4ec;color:#c62828}
        .tag-coach{background:#f3e5f5;color:#6a1b9a}
        .summary{margin-top:2rem;background:#f8f9fa;border-radius:8px;padding:1rem;font-size:0.9rem}
        .summary td{padding:0.3rem 1rem 0.3rem 0}
        @media print{body{margin:1rem}.room{break-inside:avoid}}
      </style></head><body>
      <h1>Room Plan</h1>
      <div class="subtitle">${Portal._escapeHtml(t.tourName||'')} &mdash; ${Portal._escapeHtml(t.destination||'')} &mdash; ${Portal._fmtDate(t.startDate)} to ${Portal._fmtDate(t.endDate)}</div>`;

    rooms.forEach(room => {
      const roomPax = (room.passengers || []).map(id => passengers.find(p => p.id === id)).filter(Boolean);
      html += `<div class="room">
        <div class="room-header"><span>${Portal._escapeHtml(room.name || 'Room')} <span style="opacity:0.7;font-weight:400;font-size:0.85em">&mdash; ${Portal._roomTypeLabel(roomPax.length)}</span></span><span>${roomPax.length} guest${roomPax.length!==1?'s':''}</span></div>
        <div class="room-body">`;
      if (roomPax.length) {
        roomPax.forEach(p => {
          html += `<div class="guest">
            <span class="guest-name">${Portal._escapeHtml((p.firstName||'')+' '+(p.lastName||''))}</span>
            <span class="tag tag-${(p.role||'player').toLowerCase()}">${Portal._escapeHtml(p.role||'Player')}</span>
            ${p.family ? '<span class="guest-detail">'+Portal._escapeHtml(p.family)+'</span>' : ''}
            ${p.dietary ? '<span class="guest-detail">Diet: '+Portal._escapeHtml(p.dietary)+'</span>' : ''}
            ${p.medical ? '<span class="guest-detail">Medical: Yes</span>' : ''}
          </div>`;
        });
      } else {
        html += '<div style="color:#aaa;padding:0.5rem 0">Empty room</div>';
      }
      html += `</div></div>`;
    });

    // Summary
    const assigned = new Set();
    rooms.forEach(r => (r.passengers||[]).forEach(id => assigned.add(id)));
    const unassigned = passengers.filter(p => !assigned.has(p.id));
    const players = passengers.filter(p => (p.role||'Player')==='Player').length;
    const siblings = passengers.filter(p => p.role==='Sibling').length;
    const adults = passengers.filter(p => p.role==='Adult').length;
    const coaches = passengers.filter(p => p.role==='Coach').length;

    const singles = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length === 1).length;
    const twins = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length === 2).length;
    const triples = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length === 3).length;
    const quads = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length >= 4).length;

    html += `<div class="summary"><table>
      <tr><td><strong>Total Passengers:</strong></td><td>${passengers.length}</td></tr>
      <tr><td><strong>Players:</strong></td><td>${players}</td></tr>
      <tr><td><strong>Siblings:</strong></td><td>${siblings}</td></tr>
      <tr><td><strong>Adults:</strong></td><td>${adults}</td></tr>
      <tr><td><strong>Coaches:</strong></td><td>${coaches}</td></tr>
      <tr><td><strong>Total Rooms:</strong></td><td>${rooms.length}</td></tr>
      ${singles ? '<tr><td><strong>Single Rooms:</strong></td><td>' + singles + '</td></tr>' : ''}
      ${twins ? '<tr><td><strong>Twin Rooms:</strong></td><td>' + twins + '</td></tr>' : ''}
      ${triples ? '<tr><td><strong>Triple Rooms:</strong></td><td>' + triples + '</td></tr>' : ''}
      ${quads ? '<tr><td><strong>Quadruple Rooms:</strong></td><td>' + quads + '</td></tr>' : ''}
      <tr><td><strong>Assigned:</strong></td><td>${assigned.size}</td></tr>
      ${unassigned.length ? '<tr><td><strong>Unassigned:</strong></td><td style="color:red">' + unassigned.length + ' (' + unassigned.map(p=>(p.firstName||'')+' '+(p.lastName||'')).join(', ') + ')</td></tr>' : ''}
    </table></div>
    <div style="margin-top:2rem;text-align:center;color:#aaa;font-size:0.8rem">
      Generated by Odisea Tours &mdash; ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
    </div></body></html>`;

    // Open as printable page
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  },

  downloadRoomPlanExcel() {
    const t = this.tourData;
    const passengers = this._passengers;
    const rooms = this._roomPlan;
    const assigned = new Set();
    rooms.forEach(r => (r.passengers || []).forEach(id => assigned.add(id)));
    const unassigned = passengers.filter(p => !assigned.has(p.id));

    const esc = v => {
      const s = String(v || '').replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s + '"' : s;
    };

    const lines = [];
    // Header
    lines.push(['Room', 'Room Type', 'Guest Name', 'Role', 'Family', 'Nationality', 'Date of Birth', 'Dietary', 'Medical', 'Passport'].map(esc).join(','));

    // Room rows
    rooms.forEach(room => {
      const roomPax = (room.passengers || []).map(id => passengers.find(p => p.id === id)).filter(Boolean);
      const roomType = Portal._roomTypeLabel(roomPax.length);
      if (roomPax.length) {
        roomPax.forEach((p, i) => {
          lines.push([
            room.name || 'Room',
            i === 0 ? roomType : '',
            (p.firstName || '') + ' ' + (p.lastName || ''),
            p.role || '', p.family || '', p.nationality || '',
            p.dateOfBirth || '', p.dietary || '', p.medical || '',
            p.passportNumber || ''
          ].map(esc).join(','));
        });
      } else {
        lines.push([room.name || 'Room', 'Empty', '(empty)', '', '', '', '', '', '', ''].map(esc).join(','));
      }
    });

    // Unassigned
    if (unassigned.length) {
      lines.push('');
      lines.push('UNASSIGNED');
      unassigned.forEach(p => {
        lines.push([
          '', '',
          (p.firstName || '') + ' ' + (p.lastName || ''),
          p.role || '', p.family || '', p.nationality || '',
          p.dateOfBirth || '', p.dietary || '', p.medical || '',
          p.passportNumber || ''
        ].map(esc).join(','));
      });
    }

    // Summary with room type breakdown
    const csvSingles = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length === 1).length;
    const csvTwins = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length === 2).length;
    const csvTriples = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length === 3).length;
    const csvQuads = rooms.filter(r => (r.passengers||[]).filter(id => passengers.find(p => p.id === id)).length >= 4).length;

    lines.push('');
    lines.push('SUMMARY');
    lines.push('Total Passengers,' + passengers.length);
    lines.push('Total Rooms,' + rooms.length);
    if (csvSingles) lines.push('Single Rooms,' + csvSingles);
    if (csvTwins) lines.push('Twin Rooms,' + csvTwins);
    if (csvTriples) lines.push('Triple Rooms,' + csvTriples);
    if (csvQuads) lines.push('Quadruple Rooms,' + csvQuads);
    lines.push('Assigned,' + assigned.size);
    lines.push('Unassigned,' + unassigned.length);

    // BOM + CSV content — BOM ensures Excel reads UTF-8 correctly
    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Room_Plan_' + (t.tourName || 'Tour').replace(/[^a-zA-Z0-9]/g, '_') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  async renderMessages() {
    const container = document.getElementById('section-messages');
    const isFamily = this._portalMode === 'family' && this._familyId;

    if (isFamily) {
      // Two-tab UI: Announcements (read-only) + Private Chat (2-way)
      container.innerHTML = `
        <div class="section-header">
          <h2>${Portal._t('messages')}</h2>
          <p>${Portal._t('familyMessagesDesc')}</p>
        </div>
        <div class="msg-tabs">
          <button class="msg-tab${this._messageTab === 'announcements' ? ' active' : ''}" onclick="Portal.switchMessageTab('announcements')">${Portal._t('announcements')}</button>
          <button class="msg-tab${this._messageTab === 'private' ? ' active' : ''}" onclick="Portal.switchMessageTab('private')">${Portal._t('privateChat')}</button>
        </div>
        <div class="chat-container">
          <div class="chat-messages" id="chat-messages">
            <div style="text-align:center;padding:2rem"><div class="spinner"></div></div>
          </div>
          ${this._messageTab === 'private' ? `
          <form class="chat-input" onsubmit="Portal.sendMessage(event)">
            <input type="text" id="chat-input" placeholder="${Portal._t('typeMessage')}" autocomplete="off">
            <button type="submit" class="chat-send-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>` : `
          <div style="padding:0.8rem 1rem;border-top:1px solid var(--gray-100);text-align:center;color:var(--gray-400);font-size:0.82rem">${Portal._t('announcementsReadOnly')}</div>`}
        </div>`;
    } else {
      // Tour mode: single chat (original)
      container.innerHTML = `
        <div class="section-header">
          <h2>${Portal._t('messages')}</h2>
          <p>${Portal._t('chatWithOperator')}</p>
        </div>
        <div class="chat-container">
          <div class="chat-messages" id="chat-messages">
            <div style="text-align:center;padding:2rem"><div class="spinner"></div></div>
          </div>
          <form class="chat-input" onsubmit="Portal.sendMessage(event)">
            <input type="text" id="chat-input" placeholder="${Portal._t('typeMessage')}" autocomplete="off">
            <button type="submit" class="chat-send-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>
        </div>`;
    }

    this.listenToMessages();
  },

  switchMessageTab(tab) {
    this._messageTab = tab;
    this.renderMessages();
  },

  _renderFilteredMessages(messages) {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;
    const isFamily = this._portalMode === 'family' && this._familyId;

    let filtered;
    if (!isFamily) {
      filtered = messages;
    } else if (this._messageTab === 'announcements') {
      filtered = messages.filter(m => !m.type || m.type === 'group');
    } else {
      filtered = messages.filter(m => m.type === 'family' && String(m.familyId) === String(this._familyId));
    }

    if (!filtered.length) {
      messagesEl.innerHTML = `<div class="empty-state"><p>${Portal._t('noMessages')}</p></div>`;
      return;
    }

    messagesEl.innerHTML = filtered.map(m => `
      <div class="chat-bubble ${m.sender === 'admin' ? 'admin' : 'client'}">
        ${(m.type === 'group' || !m.type) && isFamily ? '<div class="msg-badge-announce">' + Portal._t('announcement') + '</div>' : ''}
        <div>${Portal._escapeHtml(m.text || '')}</div>
        <div class="bubble-meta">${m.sender === 'admin' ? 'Odisea Tours' : (m.senderName || 'You')} \u2022 ${Portal._fmtTime(m.timestamp)}</div>
      </div>
    `).join('');

    messagesEl.scrollTop = messagesEl.scrollHeight;
  },

  listenToMessages() {
    if (this._messageListener) this._messageListener();
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;

    const isFamily = this._portalMode === 'family' && this._familyId;

    if (isFamily) {
      this._messageListener = DB.listenToFamilyMessages(this.tourId, this._familyId, (filtered, all) => {
        this._allMessages = all;
        this._renderFilteredMessages(filtered);
      });
    } else {
      this._messageListener = DB.listenToTourMessages(this.tourId, messages => {
        this._allMessages = messages;
        this._renderFilteredMessages(messages);
      });
    }
  },

  async sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    const isFamily = this._portalMode === 'family' && this._familyId;
    const msg = {
      text: text,
      sender: 'client',
      senderName: isFamily ? (this._familyData ? this._familyData.name : 'Family') : (this.tourData.groupName || 'Client')
    };

    if (isFamily) {
      msg.type = 'family';
      msg.familyId = this._familyId;
    }

    await DB.sendTourMessage(this.tourId, msg);
  },

  // ── Forms & Consent ──
  async renderForms() {
    const container = document.getElementById('section-forms');
    const t = this.tourData;
    if (!t) return;

    const requiredForms = t.requiredForms || ['terms', 'medical', 'photo'];

    // Load existing signatures from Firestore
    let signatures = {};
    try {
      const sigDoc = await DB.firestore.collection('tours').doc(this.tourId).collection('consent').doc('signatures').get();
      if (sigDoc.exists) signatures = sigDoc.data() || {};
    } catch (e) {}

    const sessionCode = sessionStorage.getItem('portal_code') || 'client';
    const mySignatures = signatures[sessionCode] || {};

    const formDefs = {
      terms: { title: 'Terms & Conditions', desc: 'I accept the tour terms and conditions, including cancellation policy and travel insurance requirements.' },
      medical: { title: 'Medical Declaration', desc: 'I confirm that all medical conditions have been disclosed in the passenger registration forms and that all travelers are fit to travel.' },
      photo: { title: 'Photo Consent', desc: 'I consent to photographs and videos being taken during the tour for promotional and record-keeping purposes.' }
    };

    container.innerHTML = `
      <div class="section-header">
        <h2>Forms & Consent</h2>
        <p>Please review and sign the required forms below</p>
      </div>
      ${requiredForms.map(formId => {
        const def = formDefs[formId] || { title: formId, desc: '' };
        const signed = mySignatures[formId];
        return `
          <div style="background:white;border-radius:var(--radius-lg);padding:1.2rem;margin-bottom:1rem;box-shadow:var(--shadow);border-left:4px solid ${signed ? 'var(--green)' : 'var(--amber)'}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
              <h3 style="font-size:1rem;color:var(--navy)">${def.title}</h3>
              ${signed ? '<span style="background:var(--green);color:white;padding:0.2rem 0.8rem;border-radius:12px;font-size:0.78rem;font-weight:600">Signed</span>' : '<span style="background:var(--amber);color:white;padding:0.2rem 0.8rem;border-radius:12px;font-size:0.78rem;font-weight:600">Pending</span>'}
            </div>
            <p style="font-size:0.88rem;color:var(--gray-500);margin-bottom:1rem">${def.desc}</p>
            ${signed ? `
              <div style="background:var(--gray-50);padding:0.8rem;border-radius:var(--radius)">
                <p style="font-size:0.82rem;color:var(--gray-400)">Signed on: ${Portal._fmtDate(signed.date)}</p>
                <img src="${signed.signature}" style="max-width:200px;max-height:60px;border:1px solid var(--gray-200);border-radius:var(--radius);margin-top:0.3rem" alt="Signature">
              </div>
            ` : `
              <label style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem;font-size:0.88rem;cursor:pointer">
                <input type="checkbox" id="consent-check-${formId}"> I agree to the above
              </label>
              <div style="margin-bottom:0.5rem">
                <label style="font-size:0.82rem;font-weight:600;color:var(--gray-500);display:block;margin-bottom:0.3rem">Sign below:</label>
                <canvas id="sig-canvas-${formId}" width="300" height="100" style="border:1.5px solid var(--gray-200);border-radius:var(--radius);cursor:crosshair;touch-action:none;background:white"></canvas>
                <div style="display:flex;gap:0.5rem;margin-top:0.3rem">
                  <button class="btn-outline btn-sm" onclick="Portal.clearSignature('${formId}')">Clear</button>
                  <button class="btn-primary btn-sm" onclick="Portal.submitConsent('${formId}')">Submit</button>
                </div>
              </div>
            `}
          </div>`;
      }).join('')}`;

    // Initialize signature canvases
    setTimeout(() => {
      requiredForms.forEach(formId => {
        if (!mySignatures[formId]) Portal._initSignatureCanvas(formId);
      });
    }, 100);
  },

  _signatureCanvases: {},

  _initSignatureCanvas(formId) {
    const canvas = document.getElementById('sig-canvas-' + formId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e) => { e.preventDefault(); drawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
    const move = (e) => { if (!drawing) return; e.preventDefault(); const pos = getPos(e); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111'; ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
    const end = () => { drawing = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', move);
    canvas.addEventListener('touchend', end);

    this._signatureCanvases[formId] = canvas;
  },

  clearSignature(formId) {
    const canvas = document.getElementById('sig-canvas-' + formId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  },

  async submitConsent(formId) {
    const checkbox = document.getElementById('consent-check-' + formId);
    if (!checkbox || !checkbox.checked) { alert('Please check the agreement box first.'); return; }

    const canvas = document.getElementById('sig-canvas-' + formId);
    if (!canvas) return;

    // Check if canvas has any content
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((val, i) => i % 4 === 3 && val > 0);
    if (!hasContent) { alert('Please sign in the signature area.'); return; }

    const signatureData = canvas.toDataURL('image/png');
    const sessionCode = sessionStorage.getItem('portal_code') || 'client';

    try {
      const ref = DB.firestore.collection('tours').doc(this.tourId).collection('consent').doc('signatures');
      const doc = await ref.get();
      const existing = doc.exists ? doc.data() : {};
      if (!existing[sessionCode]) existing[sessionCode] = {};
      existing[sessionCode][formId] = { signature: signatureData, date: new Date().toISOString(), agreed: true };
      await ref.set(existing);
      this.renderForms();
    } catch (e) {
      alert('Failed to save consent. Please try again.');
    }
  },

  // ── Feedback Survey ──
  async renderFeedback() {
    const container = document.getElementById('section-feedback');
    const t = this.tourData;
    if (!t) return;

    // Check if tour has ended
    const tourEnd = new Date(t.endDate);
    const now = new Date();
    if (now < tourEnd) {
      container.innerHTML = `
        <div class="section-header"><h2>Feedback</h2><p>Share your experience</p></div>
        <div class="empty-state"><p>Feedback will be available after the tour ends on ${Portal._fmtDate(t.endDate)}.</p></div>`;
      return;
    }

    // Check if already submitted
    const sessionCode = sessionStorage.getItem('portal_code') || 'client';
    let existingFeedback = null;
    try {
      const fbDoc = await DB.firestore.collection('tours').doc(this.tourId).collection('feedback').doc(sessionCode).get();
      if (fbDoc.exists) existingFeedback = fbDoc.data();
    } catch (e) {}

    if (existingFeedback) {
      container.innerHTML = `
        <div class="section-header"><h2>Feedback</h2><p>Thank you for your feedback!</p></div>
        <div style="background:white;border-radius:var(--radius-lg);padding:1.5rem;box-shadow:var(--shadow)">
          <div style="text-align:center;margin-bottom:1rem">
            <div style="font-size:2rem;color:var(--amber)">${'\u2605'.repeat(existingFeedback.overall)}${'\u2606'.repeat(5 - existingFeedback.overall)}</div>
            <p style="font-weight:600;margin-top:0.3rem">Overall Rating: ${existingFeedback.overall}/5</p>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;margin-bottom:1rem">
            <div style="text-align:center"><div style="font-size:0.82rem;color:var(--gray-400)">Accommodation</div><div style="color:var(--amber)">${'\u2605'.repeat(existingFeedback.accommodation||0)}</div></div>
            <div style="text-align:center"><div style="font-size:0.82rem;color:var(--gray-400)">Activities</div><div style="color:var(--amber)">${'\u2605'.repeat(existingFeedback.activities||0)}</div></div>
            <div style="text-align:center"><div style="font-size:0.82rem;color:var(--gray-400)">Guide</div><div style="color:var(--amber)">${'\u2605'.repeat(existingFeedback.guide||0)}</div></div>
          </div>
          ${existingFeedback.comments ? `<div style="background:var(--gray-50);padding:0.8rem;border-radius:var(--radius);font-size:0.88rem">"${Portal._escapeHtml(existingFeedback.comments)}"</div>` : ''}
          <p style="font-size:0.78rem;color:var(--gray-400);margin-top:0.8rem;text-align:center">Submitted ${Portal._fmtDate(existingFeedback.submittedAt)}</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="section-header"><h2>Feedback</h2><p>Tell us about your experience</p></div>
      <div style="background:white;border-radius:var(--radius-lg);padding:1.5rem;box-shadow:var(--shadow)">
        <form onsubmit="Portal.submitFeedback(event)">
          ${['overall', 'accommodation', 'activities', 'guide'].map(cat => `
            <div style="margin-bottom:1.2rem">
              <label style="font-weight:600;font-size:0.92rem;display:block;margin-bottom:0.3rem">${cat.charAt(0).toUpperCase() + cat.slice(1)} Rating</label>
              <div style="display:flex;gap:0.3rem" id="fb-${cat}">
                ${[1,2,3,4,5].map(n => `<button type="button" class="fb-star" data-cat="${cat}" data-val="${n}" onclick="Portal.setRating('${cat}',${n})" style="background:none;border:none;font-size:1.8rem;cursor:pointer;color:var(--gray-200);transition:color 0.2s">\u2605</button>`).join('')}
              </div>
            </div>
          `).join('')}
          <div style="margin-bottom:1rem">
            <label style="font-weight:600;font-size:0.92rem;display:block;margin-bottom:0.3rem">Comments</label>
            <textarea id="fb-comments" rows="4" placeholder="Share your thoughts about the tour..." style="width:100%;padding:0.6rem;border:1.5px solid var(--gray-200);border-radius:var(--radius);font-family:inherit;font-size:0.88rem;resize:vertical"></textarea>
          </div>
          <button type="submit" class="btn-primary" style="width:100%;padding:0.8rem;font-size:1rem">Submit Feedback</button>
        </form>
      </div>`;
  },

  _feedbackRatings: {},

  setRating(category, value) {
    this._feedbackRatings[category] = value;
    const container = document.getElementById('fb-' + category);
    if (!container) return;
    container.querySelectorAll('.fb-star').forEach(btn => {
      const v = Number(btn.dataset.val);
      btn.style.color = v <= value ? 'var(--amber)' : 'var(--gray-200)';
    });
  },

  async submitFeedback(event) {
    event.preventDefault();
    const ratings = this._feedbackRatings;
    if (!ratings.overall) { alert('Please rate your overall experience.'); return; }

    const feedback = {
      overall: ratings.overall || 0,
      accommodation: ratings.accommodation || 0,
      activities: ratings.activities || 0,
      guide: ratings.guide || 0,
      comments: document.getElementById('fb-comments').value.trim(),
      submittedAt: new Date().toISOString()
    };

    const sessionCode = sessionStorage.getItem('portal_code') || 'client';
    try {
      await DB.firestore.collection('tours').doc(this.tourId).collection('feedback').doc(sessionCode).set(feedback);
      this._feedbackRatings = {};
      this.renderFeedback();
    } catch (e) {
      alert('Failed to submit feedback. Please try again.');
    }
  },

  // ── Payment Status ──
  async renderPaymentStatus() {
    const container = document.getElementById('section-payments');
    const t = this.tourData;
    if (!t) return;

    const isFamily = this._portalMode === 'family' && this._familyId;

    // Load invoices: family-scoped or all
    let invoices = [];
    try {
      if (isFamily) {
        invoices = await DB.getTourInvoicesForFamily(this.tourId, this._familyId);
      } else {
        invoices = await DB.getTourInvoices(this.tourId);
      }
    } catch (e) {}

    this._paymentInvoices = invoices;

    if (!invoices.length) {
      container.innerHTML = `
        <div class="section-header"><h2>Payments</h2><p>Your payment status</p></div>
        <div class="empty-state"><p>No invoices available yet. Contact your tour operator for payment details.</p></div>`;
      return;
    }

    const totalDue = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalPaid = invoices.reduce((s, i) => s + (i.payments || []).reduce((ps, p) => ps + Number(p.amount), 0), 0);
    const balance = totalDue - totalPaid;
    const pctPaid = totalDue > 0 ? Math.min(100, Math.round(totalPaid / totalDue * 100)) : 0;
    const cur = invoices[0].currency || t.currency || 'EUR';

    container.innerHTML = `
      <div class="section-header"><h2>Payments</h2><p>Track your payment progress</p></div>
      <div style="background:white;border-radius:var(--radius-lg);padding:1.5rem;box-shadow:var(--shadow);margin-bottom:1rem">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1.2rem;text-align:center">
          <div>
            <div style="font-size:0.78rem;color:var(--gray-400);text-transform:uppercase;font-weight:600">Total Due</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--navy)">${Portal._fmtCurrency(totalDue, cur)}</div>
          </div>
          <div>
            <div style="font-size:0.78rem;color:var(--gray-400);text-transform:uppercase;font-weight:600">Paid</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--green)">${Portal._fmtCurrency(totalPaid, cur)}</div>
          </div>
          <div>
            <div style="font-size:0.78rem;color:var(--gray-400);text-transform:uppercase;font-weight:600">Balance</div>
            <div style="font-size:1.3rem;font-weight:700;color:${balance > 0 ? 'var(--red)' : 'var(--green)'}">${Portal._fmtCurrency(balance, cur)}</div>
          </div>
        </div>
        <div style="background:var(--gray-100);border-radius:10px;height:12px;overflow:hidden;margin-bottom:0.5rem">
          <div style="background:${pctPaid >= 100 ? 'var(--green)' : 'var(--amber)'};height:100%;width:${pctPaid}%;border-radius:10px;transition:width 0.5s"></div>
        </div>
        <p style="text-align:center;font-size:0.82rem;color:var(--gray-400)">${pctPaid}% paid</p>
      </div>

      ${invoices.map(inv => {
        const paid = (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);
        const invBalance = Number(inv.amount) - paid;
        const schedule = inv.paymentSchedule || [];
        return `
          <div style="background:white;border-radius:var(--radius-lg);padding:1.2rem;margin-bottom:1rem;box-shadow:var(--shadow)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem">
              <div style="display:flex;align-items:center;gap:0.5rem">
                <h3 style="font-size:0.95rem;color:var(--navy)">${inv.number || 'Invoice'}</h3>
                <button onclick="Portal.downloadInvoice(${inv.id})" style="background:none;border:1.5px solid var(--navy);color:var(--navy);border-radius:var(--radius);padding:0.2rem 0.5rem;font-size:0.72rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.3rem">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  PDF
                </button>
              </div>
              <span style="font-weight:700;color:${invBalance <= 0 ? 'var(--green)' : 'var(--red)'}">${Portal._fmtCurrency(invBalance, inv.currency || cur)} ${invBalance <= 0 ? 'PAID' : 'due'}</span>
            </div>
            ${schedule.length ? `
              <div style="margin-bottom:0.8rem">
                <div style="font-size:0.82rem;font-weight:600;color:var(--gray-500);margin-bottom:0.5rem">Payment Schedule</div>
                ${schedule.map(ms => {
                  const msAmount = ms.amount || (ms.percentage ? Number(inv.amount) * ms.percentage / 100 : 0);
                  const msPaid = paid >= msAmount;
                  return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid var(--gray-50)">
                    <span style="color:${msPaid ? 'var(--green)' : 'var(--gray-300)'};font-size:1.1rem">${msPaid ? '\u2713' : '\u25CB'}</span>
                    <span style="flex:1;font-size:0.85rem;${msPaid ? 'text-decoration:line-through;color:var(--gray-400)' : ''}">${ms.label || 'Payment'}</span>
                    <span style="font-weight:600;font-size:0.85rem">${Portal._fmtCurrency(msAmount, inv.currency || cur)}</span>
                    ${ms.dueDate ? '<span style="font-size:0.78rem;color:var(--gray-400)">' + Portal._fmtDate(ms.dueDate) + '</span>' : ''}
                  </div>`;
                }).join('')}
              </div>
            ` : ''}
            ${(inv.payments || []).length ? `
              <div style="font-size:0.82rem;font-weight:600;color:var(--gray-500);margin-bottom:0.3rem">Payment History</div>
              ${(inv.payments || []).map(p => `
                <div style="display:flex;justify-content:space-between;padding:0.3rem 0;font-size:0.82rem;border-bottom:1px solid var(--gray-50)">
                  <span>${Portal._fmtDate(p.date)}</span>
                  <span style="font-weight:600;color:var(--green)">+${Portal._fmtCurrency(Number(p.amount), inv.currency || cur)}</span>
                </div>
              `).join('')}
            ` : ''}
          </div>`;
      }).join('')}

      ${(t.portalPaymentCard || t.portalPaymentWise) ? `
        <div style="display:flex;gap:0.8rem;flex-wrap:wrap;margin-top:1rem">
          ${t.portalPaymentCard ? '<a href="' + Portal._escapeAttr(t.portalPaymentCard) + '" target="_blank" rel="noopener" style="flex:1;min-width:180px;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.8rem;background:var(--navy);color:white;border-radius:var(--radius-lg);text-decoration:none;font-weight:600">Pay by Card</a>' : ''}
          ${t.portalPaymentWise ? '<a href="' + Portal._escapeAttr(t.portalPaymentWise) + '" target="_blank" rel="noopener" style="flex:1;min-width:180px;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.8rem;background:#9FE870;color:#163300;border-radius:var(--radius-lg);text-decoration:none;font-weight:600">Pay via Wise</a>' : ''}
        </div>` : ''}`;
  },

  downloadInvoice(invoiceId) {
    const allInv = (this._paymentInvoices || []).concat(this._invoices || []);
    const inv = allInv.find(x => x.id === invoiceId);
    if (!inv) { alert('Invoice not found.'); return; }
    const source = this.tourData || {};
    if (typeof PDFQuote !== 'undefined' && PDFQuote._openInvoiceWindow) {
      PDFQuote._openInvoiceWindow(inv, source, PDFQuote.LOGO_URI);
    } else {
      alert('PDF generator not available. Please try again.');
    }
  },

  // ── Terms & Conditions Section ──
  renderTerms() {
    const container = document.getElementById('section-terms');
    const t = Portal._t.bind(Portal);
    const sectionStyle = 'background:white;border-radius:var(--radius-lg);padding:1.2rem 1.3rem;box-shadow:var(--shadow);margin-bottom:1rem';
    const h3Style = 'font-size:1rem;font-weight:700;color:var(--navy);margin:0 0 0.6rem';
    const pStyle = 'font-size:0.88rem;color:var(--gray-600);line-height:1.65;margin:0 0 0.6rem';
    const lastP = 'font-size:0.88rem;color:var(--gray-600);line-height:1.65;margin:0';

    container.innerHTML = `
      <div class="section-header">
        <h2>${t('termsTitle')}</h2>
        <p style="font-size:0.85rem;color:var(--gray-400)">${t('termsLastUpdated')}: February 2026</p>
      </div>

      <div style="${sectionStyle}">
        <p style="${lastP}">${t('termsIntro')}</p>
      </div>

      <div style="${sectionStyle}">
        <h3 style="${h3Style}">1. ${t('termsBooking')}</h3>
        <p style="${pStyle}">${t('termsBookingP1')}</p>
        <p style="${lastP}">${t('termsBookingP2')}</p>
      </div>

      <div style="${sectionStyle}">
        <h3 style="${h3Style}">2. ${t('termsPayment')}</h3>
        <p style="${pStyle}">${t('termsPaymentP1')}</p>
        <p style="${pStyle}">${t('termsPaymentP2')}</p>
        <p style="${lastP}">${t('termsPaymentP3')}</p>
      </div>

      <div style="${sectionStyle};border-left:4px solid var(--red)">
        <h3 style="${h3Style};color:var(--red)">3. ${t('termsCancellation')}</h3>
        <p style="${pStyle};font-weight:600">${t('termsCancellationP1')}</p>
        <p style="${pStyle}">${t('termsCancellationP2')}</p>
        <div style="margin:0.6rem 0 1rem;border-radius:var(--radius);overflow:hidden;border:1px solid var(--gray-100)">
          <div style="display:flex;align-items:center;padding:0.55rem 0.8rem;background:var(--green);color:white;font-size:0.84rem;font-weight:600;gap:0.5rem">
            <span style="font-size:1.1rem">90+</span><span style="flex:1">${t('termsCancellationTier1')}</span>
          </div>
          <div style="display:flex;align-items:center;padding:0.55rem 0.8rem;background:var(--amber);color:white;font-size:0.84rem;font-weight:600;gap:0.5rem">
            <span style="font-size:1.1rem">60–89</span><span style="flex:1">${t('termsCancellationTier2')}</span>
          </div>
          <div style="display:flex;align-items:center;padding:0.55rem 0.8rem;background:#e67e22;color:white;font-size:0.84rem;font-weight:600;gap:0.5rem">
            <span style="font-size:1.1rem">30–59</span><span style="flex:1">${t('termsCancellationTier3')}</span>
          </div>
          <div style="display:flex;align-items:center;padding:0.55rem 0.8rem;background:var(--red);color:white;font-size:0.84rem;font-weight:600;gap:0.5rem">
            <span style="font-size:1.1rem">&lt;30</span><span style="flex:1">${t('termsCancellationTier4')}</span>
          </div>
        </div>
        <p style="${pStyle}">${t('termsCancellationP3')}</p>
        <p style="${lastP}">${t('termsCancellationP4')}</p>
      </div>

      <div style="${sectionStyle}">
        <h3 style="${h3Style}">4. ${t('termsChanges')}</h3>
        <p style="${pStyle}">${t('termsChangesP1')}</p>
        <p style="${pStyle}">${t('termsChangesP2')}</p>
        <p style="${lastP}">${t('termsChangesP3')}</p>
      </div>

      <div style="${sectionStyle}">
        <h3 style="${h3Style}">5. ${t('termsTravel')}</h3>
        <p style="${pStyle}">${t('termsTravelP1')}</p>
        <p style="${lastP}">${t('termsTravelP2')}</p>
      </div>

      <div style="${sectionStyle}">
        <h3 style="${h3Style}">6. ${t('termsLiability')}</h3>
        <p style="${pStyle}">${t('termsLiabilityP1')}</p>
        <p style="${lastP}">${t('termsLiabilityP2')}</p>
      </div>

      <div style="${sectionStyle}">
        <h3 style="${h3Style}">7. ${t('termsConduct')}</h3>
        <p style="${lastP}">${t('termsConductP1')}</p>
      </div>

      <div style="${sectionStyle}">
        <h3 style="${h3Style}">8. ${t('termsContact')}</h3>
        <p style="${lastP}">${t('termsContactP1')}</p>
      </div>`;
  },

  // ── Flights Section ──
  async renderFlights() {
    const container = document.getElementById('section-flights');
    if (!container) return;

    const isFamily = this._portalMode === 'family' && this._familyId;

    // Load existing flight data
    container.innerHTML = '<div style="text-align:center;padding:2rem"><div class="spinner"></div></div>';
    if (isFamily) {
      this._flightData = await DB.getFamilyFlight(this.tourId, this._familyId);
    } else {
      this._flightData = await DB.getTourFlights(this.tourId);
    }
    const f = this._flightData || {};
    const arr = f.arrival || {};
    const ret = f.return || {};
    const isSubmitted = !!(arr.flightNumber || ret.flightNumber);
    const statusTag = isSubmitted
      ? `<span style="background:rgba(46,204,113,0.12);color:#1e8449;padding:0.25rem 0.75rem;border-radius:12px;font-size:0.78rem;font-weight:600">${Portal._t('flightsSubmitted')}</span>`
      : `<span style="background:rgba(231,76,60,0.12);color:#c0392b;padding:0.25rem 0.75rem;border-radius:12px;font-size:0.78rem;font-weight:600">${Portal._t('flightsNotSubmitted')}</span>`;

    container.innerHTML = `
      <div class="section-header">
        <h2>${Portal._t('flightDetails')}</h2>
        <p style="display:flex;align-items:center;gap:0.5rem">${this._familyData ? this._familyData.name : ''} ${statusTag}</p>
      </div>
      <form onsubmit="Portal.saveFlights(event)">
        <div class="flight-section">
          <div class="flight-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5 5.1 3 -1.9 1.9-2.1-.5-.6.6 2.6 1.5 1.5 2.6.6-.6-.5-2.1 1.9-1.9 3 5.1.5-.3c.4-.2.6-.6.5-1.1z"/></svg>
            ${Portal._t('arrivalFlight')}
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label>${Portal._t('flightDate')}</label><input type="date" id="fl-arr-date" value="${Portal._escapeAttr(arr.date || '')}"></div>
            <div class="form-group"><label>${Portal._t('flightNumber')}</label><input id="fl-arr-number" placeholder="e.g. BA2472" value="${Portal._escapeAttr(arr.flightNumber || '')}"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label>${Portal._t('airline')}</label><input id="fl-arr-airline" placeholder="e.g. British Airways" value="${Portal._escapeAttr(arr.airline || '')}"></div>
            <div class="form-group"><label>${Portal._t('terminal')}</label><input id="fl-arr-terminal" placeholder="e.g. T5" value="${Portal._escapeAttr(arr.terminal || '')}"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label>${Portal._t('departureAirport')}</label><input id="fl-arr-dep-airport" placeholder="e.g. LHR" value="${Portal._escapeAttr(arr.departureAirport || '')}"></div>
            <div class="form-group"><label>${Portal._t('arrivalAirport')}</label><input id="fl-arr-arr-airport" placeholder="e.g. MAD" value="${Portal._escapeAttr(arr.arrivalAirport || '')}"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label>${Portal._t('departureTime')}</label><input type="time" id="fl-arr-dep-time" value="${Portal._escapeAttr(arr.departureTime || '')}"></div>
            <div class="form-group"><label>${Portal._t('arrivalTime')}</label><input type="time" id="fl-arr-arr-time" value="${Portal._escapeAttr(arr.arrivalTime || '')}"></div>
          </div>
          <div class="form-group"><label>${Portal._t('flightNotes')}</label><input id="fl-arr-notes" placeholder="" value="${Portal._escapeAttr(arr.notes || '')}"></div>
        </div>

        <div class="flight-section">
          <div class="flight-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform:scaleX(-1)"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5 5.1 3 -1.9 1.9-2.1-.5-.6.6 2.6 1.5 1.5 2.6.6-.6-.5-2.1 1.9-1.9 3 5.1.5-.3c.4-.2.6-.6.5-1.1z"/></svg>
            ${Portal._t('returnFlight')}
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label>${Portal._t('flightDate')}</label><input type="date" id="fl-ret-date" value="${Portal._escapeAttr(ret.date || '')}"></div>
            <div class="form-group"><label>${Portal._t('flightNumber')}</label><input id="fl-ret-number" placeholder="e.g. BA2473" value="${Portal._escapeAttr(ret.flightNumber || '')}"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label>${Portal._t('airline')}</label><input id="fl-ret-airline" placeholder="e.g. British Airways" value="${Portal._escapeAttr(ret.airline || '')}"></div>
            <div class="form-group"><label>${Portal._t('terminal')}</label><input id="fl-ret-terminal" placeholder="e.g. T5" value="${Portal._escapeAttr(ret.terminal || '')}"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label>${Portal._t('departureAirport')}</label><input id="fl-ret-dep-airport" placeholder="e.g. MAD" value="${Portal._escapeAttr(ret.departureAirport || '')}"></div>
            <div class="form-group"><label>${Portal._t('arrivalAirport')}</label><input id="fl-ret-arr-airport" placeholder="e.g. LHR" value="${Portal._escapeAttr(ret.arrivalAirport || '')}"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label>${Portal._t('departureTime')}</label><input type="time" id="fl-ret-dep-time" value="${Portal._escapeAttr(ret.departureTime || '')}"></div>
            <div class="form-group"><label>${Portal._t('arrivalTime')}</label><input type="time" id="fl-ret-arr-time" value="${Portal._escapeAttr(ret.arrivalTime || '')}"></div>
          </div>
          <div class="form-group"><label>${Portal._t('flightNotes')}</label><input id="fl-ret-notes" placeholder="" value="${Portal._escapeAttr(ret.notes || '')}"></div>
        </div>

        <button type="submit" class="btn-primary" style="width:100%;margin-top:0.5rem">${Portal._t('submitFlights')}</button>
      </form>`;
  },

  async saveFlights(event) {
    if (event) event.preventDefault();
    if (!this.tourId) return;

    const isFamily = this._portalMode === 'family' && this._familyId;
    const val = id => (document.getElementById(id) || {}).value || '';
    const flightData = {
      familyName: isFamily ? ((this._familyData && this._familyData.name) || '') : '',
      arrival: {
        date: val('fl-arr-date'), flightNumber: val('fl-arr-number').toUpperCase(),
        airline: val('fl-arr-airline'), departureAirport: val('fl-arr-dep-airport').toUpperCase(),
        arrivalAirport: val('fl-arr-arr-airport').toUpperCase(), departureTime: val('fl-arr-dep-time'),
        arrivalTime: val('fl-arr-arr-time'), terminal: val('fl-arr-terminal').toUpperCase(),
        notes: val('fl-arr-notes')
      },
      return: {
        date: val('fl-ret-date'), flightNumber: val('fl-ret-number').toUpperCase(),
        airline: val('fl-ret-airline'), departureAirport: val('fl-ret-dep-airport').toUpperCase(),
        arrivalAirport: val('fl-ret-arr-airport').toUpperCase(), departureTime: val('fl-ret-dep-time'),
        arrivalTime: val('fl-ret-arr-time'), terminal: val('fl-ret-terminal').toUpperCase(),
        notes: val('fl-ret-notes')
      },
      submittedBy: 'portal'
    };
    // Preserve original createdAt if exists
    if (this._flightData && this._flightData.createdAt) {
      flightData.createdAt = this._flightData.createdAt;
    }

    const ok = isFamily
      ? await DB.saveFamilyFlight(this.tourId, this._familyId, flightData)
      : await DB.saveTourFlights(this.tourId, flightData);
    if (ok) {
      // Brief success feedback then re-render
      const btn = document.querySelector('#section-flights .btn-primary');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = Portal._t('flightsSaved');
        btn.style.background = 'var(--green)';
        setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 2000);
      }
      this._flightData = flightData;
    }
  },

  async _renderOverviewChecklist() {
    const el = document.getElementById('overview-checklist');
    if (!el || !this.tourId) return;

    el.innerHTML = '<div style="text-align:center;padding:1rem"><div class="spinner"></div></div>';

    const isFamily = this._portalMode === 'family' && this._familyId;
    const t = this.tourData;

    // Load data in parallel
    let passengers = [], flights = null, invoicesRaw = null, roomPlan = [];
    try {
      if (isFamily) {
        [passengers, flights, invoicesRaw] = await Promise.all([
          DB.firestore ? DB.firestore.collection('tours').doc(this.tourId).collection('passengers').where('familyId', '==', this._familyId).get().then(s => { const a=[]; s.forEach(d => a.push({id:d.id,...d.data()})); return a; }).catch(() => []) : Promise.resolve([]),
          DB.getFamilyFlight(this.tourId, this._familyId),
          DB._firebaseReady && this._familyData ? Promise.resolve(DB.getInvoices().find(i => i.individualClientRef === this._familyId && i.tourId === this.tourId) || null) : Promise.resolve(null)
        ]);
      } else {
        [passengers, flights] = await Promise.all([
          DB.getTourPassengers(this.tourId),
          DB.getTourFlights(this.tourId)
        ]);
      }
    } catch (e) {}

    roomPlan = (t && t.roomPlan) || [];
    const assignedCount = new Set();
    roomPlan.forEach(room => (room.passengers || []).forEach(id => assignedCount.add(id)));

    const items = [];

    // 1. Passengers added
    const expectedCount = isFamily
      ? (this._familyData ? ((this._familyData.numStudents||0) + (this._familyData.numSiblings||0) + (this._familyData.numAdults||0)) : 0)
      : ((t.numStudents||0) + (t.numSiblings||0) + (t.numAdults||0) + (t.numFOC||0));
    const paxOk = passengers.length > 0 && (!expectedCount || passengers.length >= expectedCount);
    items.push({ done: paxOk, label: Portal._t('clTravelersRegistered'), detail: expectedCount ? `${passengers.length}/${expectedCount}` : `${passengers.length}`, section: 'passengers' });

    // 2. Flight details submitted
    const flightsOk = !!(flights && flights.arrival && flights.arrival.flightNumber);
    items.push({ done: flightsOk, label: Portal._t('clFlightDetails'), section: 'flights' });

    // 3. Room plan assigned
    const roomOk = roomPlan.length > 0 && assignedCount.size > 0;
    items.push({ done: roomOk, label: Portal._t('roomAssignments').split(' for ')[0] || 'Room plan', detail: roomOk ? `${assignedCount.size} assigned` : '', section: 'roomplan' });

    // Family-mode extras
    if (isFamily) {
      const passportsOk = passengers.length > 0 && passengers.every(p => p.passportNumber && p.passportExpiry && p.nationality);
      items.push({ done: passportsOk, label: Portal._t('clPassportDetails'), section: 'passengers' });

      const emergencyOk = passengers.length > 0 && passengers.every(p => p.emergencyContact);
      items.push({ done: emergencyOk, label: Portal._t('clEmergencyContacts'), section: 'passengers' });

      const paymentOk = !!(invoicesRaw && invoicesRaw.amount && (invoicesRaw.payments || []).reduce((s,p) => s + Number(p.amount), 0) >= Number(invoicesRaw.amount));
      items.push({ done: paymentOk, label: Portal._t('clPaymentComplete'), section: 'payments' });
    }

    const doneCount = items.filter(i => i.done).length;
    const totalItems = items.length;
    const pct = totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0;

    el.innerHTML = `
      <div class="checklist-card">
        <h3 style="font-family:var(--font-display);color:var(--navy);font-size:1.05rem;margin-bottom:0.2rem">${Portal._t('checklistTitle')}</h3>
        <p style="font-size:0.82rem;color:var(--gray-400);margin-bottom:0.8rem">${Portal._t('checklistDesc')} &mdash; ${doneCount}/${totalItems} ${Portal._t('clItemsComplete')}</p>
        <div class="checklist-progress"><div class="checklist-progress-fill" style="width:${pct}%"></div></div>
        <div style="display:flex;flex-direction:column;gap:0.1rem">
          ${items.map(item => `
            <div class="checklist-item ${item.done ? 'checklist-done' : ''}" onclick="Portal.showSection('${item.section}')">
              <span class="checklist-icon">${item.done ? '&#10003;' : '&#9675;'}</span>
              <span>${item.label}</span>
              ${item.detail ? `<span style="margin-left:auto;font-size:0.78rem;color:var(--gray-400)">${item.detail}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>`;
  },

  _fmtCurrency(amount, currency) {
    const symbols = { EUR: '\u20AC', USD: '$', GBP: '\u00A3' };
    const sym = symbols[currency] || currency || '\u20AC';
    return sym + (Number(amount) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  // ── Utility helpers ──
  _fmtDate(d) {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  _fmtTime(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
           dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  _escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
};

// Boot portal
document.addEventListener('DOMContentLoaded', () => Portal.init());
