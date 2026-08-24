import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronRight, Clock3, CreditCard, MapPin, Menu, Scissors, ShieldCheck, Sparkles, Star, UserRound, Users, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type Barber = {
  id: string;
  name: string;
  specialty: string | null;
  isActive: boolean;
};

type BookingRecord = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  scheduledAt: string;
  barberName: string | null;
  barberId: string | null;
  status: string;
  cancelCode: string;
  service: Service;
  barber?: Barber | null;
};

type Summary = {
  totalRevenue: number;
  totalBookings: number;
  activeServices: number;
  upcomingBookings: number;
  revenueByDay: Array<{ day: string; total: number }>;
};
type BookingConfirmation = {
  cancelCode: string;
  booking: BookingRecord;
};

const scheduleDays = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() + index);
  return {
    value: date.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(date),
  };
});

const timeSlots = ['09:00', '09:45', '10:30', '11:15', '12:00', '13:30', '14:15', '15:00', '16:00', '17:00', '18:00', '19:00'];

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
});

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = url.startsWith('/') ? `${API_BASE}${url}` : url;
  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  let data: T | { message?: string } | undefined;
  try {
    data = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(`Error en el servidor (${response.status}): El servicio no está disponible.`);
    }
    throw new Error('La respuesta del servidor no tiene un formato válido.');
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data && 'message' in data ? String(data.message) : 'No se pudo completar la solicitud.';
    throw new Error(message);
  }

  return data as T;
}

function adminRequest<T>(url: string, token: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    headers: { ...(options?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
}

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.hash === '#gestion-privada');

  useEffect(() => {
    const syncRoute = () => setIsAdminRoute(window.location.hash === '#gestion-privada');
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[#c6f36b] selection:text-[#14220b]">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#101411]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-none items-center justify-between px-4 sm:h-20 sm:max-w-7xl sm:px-8">
          <a href="#inicio" className="flex items-center gap-3" aria-label="Cavalier Barber Club">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#c6f36b] text-[#14220b]"><Scissors className="h-5 w-5" /></span>
            <span className="font-display text-xl font-bold tracking-[-0.06em] text-white">cavalier<span className="text-[#c6f36b]">.</span></span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#aeb7aa] md:flex">
            <a href="#servicios" className="transition hover:text-white">Servicios</a>
            <a href="#experiencia" className="transition hover:text-white">La experiencia</a>
          </nav>
          <a href="#reservar" className="hidden rounded-full bg-[#c6f36b] px-5 py-2.5 text-sm font-bold text-[#14220b] transition hover:bg-[#d9ff8c] sm:inline-flex">Reservar turno</a>
          <button type="button" aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen((open) => !open)} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-white md:hidden">
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {isMobileMenuOpen ? <nav className="mobile-nav md:hidden"><a href="#servicios" onClick={() => setIsMobileMenuOpen(false)}>Servicios <ChevronRight className="h-4 w-4" /></a><a href="#experiencia" onClick={() => setIsMobileMenuOpen(false)}>La experiencia <ChevronRight className="h-4 w-4" /></a><a href="#reservar" onClick={() => setIsMobileMenuOpen(false)} className="mobile-nav-cta">Reservar turno <ArrowRight className="h-4 w-4" /></a></nav> : null}
      </header>

      <main id="inicio">
        {isAdminRoute ? <AdminPage /> : <PublicBookingPage />}
      </main>
    </div>
  );
}

function PublicBookingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(scheduleDays[0].value);
  const [selectedTime, setSelectedTime] = useState(timeSlots[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingResult, setBookingResult] = useState<BookingConfirmation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await apiRequest<Service[]>('/api/services');
        setServices(data);
        const firstAvailable = data.find((service) => service.isAvailable);
        if (firstAvailable) {
          setSelectedServiceId(firstAvailable.id);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los servicios.');
      }
    }

    void loadServices();
  }, []);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? services[0],
    [selectedServiceId, services]
  );

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedService || !customerName.trim()) {
      setError('Selecciona un servicio y escribe tu nombre.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      const response = await apiRequest<BookingConfirmation>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: selectedService.id,
          scheduledAt,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
        }),
      });

      setBookingResult(response);
      setCustomerName('');
      setCustomerPhone('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo confirmar la reserva.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/8 bg-[#101411] px-4 pb-14 pt-11 sm:px-8 sm:pb-20 sm:pt-20">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="mx-auto grid max-w-7xl gap-9 sm:gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div className="relative z-10 pb-4">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c6f36b]/30 bg-[#c6f36b]/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.14em] text-[#d9ff8c]"><span className="h-1.5 w-1.5 rounded-full bg-[#c6f36b]" />Agenda abierta esta semana</div>
            <h1 className="font-display max-w-3xl text-[2.8rem] font-black leading-[.93] tracking-[-.075em] text-white sm:text-7xl">Tu estilo,<br /><span className="text-[#c6f36b]">en buenas manos.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[#aeb7aa] sm:mt-7 sm:text-lg">Cortes precisos, rituales de barba y una pausa hecha para vos. Reservá tu próximo turno en menos de un minuto.</p>
            <div className="mt-7 flex flex-col gap-3 text-sm text-[#dbe1d8] sm:mt-9 sm:flex-row sm:flex-wrap sm:gap-5"><span className="flex items-center gap-2"><Star className="h-4 w-4 fill-[#c6f36b] text-[#c6f36b]" />4.9 en Google</span><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#c6f36b]" />Palermo, Buenos Aires</span></div>
          </div>
          <div className="relative min-h-[250px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#242b24] p-5 shadow-2xl shadow-black/30 sm:min-h-[390px] sm:rounded-[2rem] sm:p-7">
            <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#c6f36b]/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-[70%] w-[64%] rounded-tr-[8rem] border-r border-t border-[#c6f36b]/30 bg-[linear-gradient(145deg,#1b211c,#53614d)]" />
            <div className="relative z-10 flex min-h-[208px] flex-col"><div className="flex items-center justify-between"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">EST. 2014</span><Scissors className="h-7 w-7 text-[#c6f36b] sm:h-8 sm:w-8" /></div><div className="ml-auto mt-auto w-[13.5rem] max-w-[80%] rounded-2xl border border-white/15 bg-[#151a16]/90 p-4 backdrop-blur sm:p-5"><p className="text-xs uppercase tracking-[.16em] text-[#c6f36b]">Cavalier club</p><p className="mt-2 text-lg font-semibold leading-tight text-white sm:text-xl">Donde el detalle hace la diferencia.</p></div></div>
          </div>
        </div>
      </section>

      <section id="reservar" className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-20">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">Reservá online</p><h2 className="font-display mt-3 text-4xl font-bold tracking-[-.06em] text-white sm:text-5xl">Elegí tu momento.</h2></div><p className="max-w-sm text-sm leading-relaxed text-[#889486]">Sin llamadas, sin esperas. Te enviamos la confirmación apenas completes tu reserva.</p></div>
        <div className="grid gap-8 xl:grid-cols-[1fr_390px]">
          <div id="servicios" className="min-w-0 space-y-9">
            <div className="min-w-0"><div className="mb-4 flex items-center gap-3"><span className="step-number">01</span><h3 className="text-lg font-semibold text-white">Elegí un servicio</h3></div><div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {services.map((service) => <button key={service.id} type="button" disabled={!service.isAvailable} onClick={() => setSelectedServiceId(service.id)} className={`service-card ${selectedService?.id === service.id ? 'service-card-selected' : ''} ${!service.isAvailable ? 'opacity-40' : ''}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{service.name}</p><p className="mt-1 text-sm text-[#8f9a8d]">{service.description ?? 'Atención profesional personalizada.'}</p></div>{selectedService?.id === service.id && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#c6f36b] text-[#162110]"><Check className="h-4 w-4" /></span>}</div><div className="mt-5 flex items-center justify-between border-t border-white/8 pt-3 text-sm"><span className="flex items-center gap-1.5 text-[#aeb7aa]"><Clock3 className="h-3.5 w-3.5" />{service.duration} min</span><span className="font-bold text-[#d9ff8c]">{currencyFormatter.format(service.price)}</span></div></button>)}
            </div></div>
            <div><div className="mb-4 flex items-center gap-3"><span className="step-number">02</span><h3 className="text-lg font-semibold text-white">Buscá tu horario</h3></div><div className="rounded-2xl border border-white/8 bg-[#171d18] p-4 sm:p-5"><div className="flex gap-2 overflow-x-auto pb-2">{scheduleDays.map((day, index) => <button key={day.value} type="button" onClick={() => setSelectedDate(day.value)} className={`date-pill ${selectedDate === day.value ? 'date-pill-selected' : ''}`}><span>{index === 0 ? 'HOY' : new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(new Date(`${day.value}T12:00`)).replace('.', '').toUpperCase()}</span><b>{new Date(`${day.value}T12:00`).getDate()}</b></button>)}</div><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">{timeSlots.map((slot) => <button key={slot} type="button" onClick={() => setSelectedTime(slot)} className={`time-slot ${selectedTime === slot ? 'time-slot-selected' : ''}`}>{slot}</button>)}</div></div></div>
          </div>
          <aside className="h-fit rounded-[1.4rem] border border-[#c6f36b]/25 bg-[#202a1e] p-5 shadow-xl shadow-black/20 sm:rounded-[1.75rem] sm:p-6 xl:sticky xl:top-28">
            <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="eyebrow text-[#c6f36b]">Tu reserva</p><h3 className="mt-1 text-xl font-semibold text-white">Casi listo.</h3></div><CalendarDays className="h-6 w-6 text-[#c6f36b]" /></div>
            <form className="mt-6 space-y-4" onSubmit={handleBooking}><div className="rounded-xl bg-black/20 p-4 text-sm"><p className="font-semibold text-white">{selectedService?.name ?? 'Seleccioná un servicio'}</p><div className="mt-2 flex justify-between text-[#aeb7aa]"><span>{selectedService ? `${selectedService.duration} min` : '—'} · {selectedTime}</span><span className="text-[#d9ff8c]">{selectedService ? currencyFormatter.format(selectedService.price) : '—'}</span></div></div><div><Label htmlFor="customer-name">Tu nombre</Label><Input id="customer-name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="¿Cómo te llamás?" /></div><div><Label htmlFor="customer-phone">WhatsApp</Label><Input id="customer-phone" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="11 1234 5678" /></div>{error && <p className="text-sm text-red-300">{error}</p>}<Button type="submit" className="mt-2 w-full gap-2 !rounded-xl !bg-[#c6f36b] !font-bold !text-[#14220b] hover:!bg-[#d9ff8c]" disabled={isSubmitting || !selectedService}>{isSubmitting ? 'Confirmando...' : 'Confirmar mi turno'}<ArrowRight className="h-4 w-4" /></Button><p className="text-center text-xs text-[#9eaa9b]">Podés cancelar o reprogramar con tu código.</p></form>
            {bookingResult && <div className="mt-5 rounded-xl border border-[#c6f36b]/35 bg-[#c6f36b]/10 p-4 text-sm text-[#ecffe0]"><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-[#c6f36b]" />Turno confirmado</div><p className="mt-2 text-[#c7d4c3]">Tu código de cancelación:</p><p className="mt-1 font-mono font-bold tracking-[.2em] text-[#d9ff8c]">{bookingResult.cancelCode}</p></div>}
          </aside>
        </div>
      </section>
      <section id="experiencia" className="border-y border-white/8 bg-[#171d18] px-4 py-9 sm:px-8 sm:py-10"><div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3"><div className="flex gap-4"><Users className="h-5 w-5 shrink-0 text-[#c6f36b]" /><div><p className="font-semibold text-white">Equipo seleccionado</p><p className="mt-1 text-sm text-[#929d90]">Profesionales que entienden tu estilo.</p></div></div><div className="flex gap-4"><Star className="h-5 w-5 shrink-0 text-[#c6f36b]" /><div><p className="font-semibold text-white">Atención al detalle</p><p className="mt-1 text-sm text-[#929d90]">Cada servicio, sin apuro y a medida.</p></div></div><div className="flex gap-4"><ChevronRight className="h-5 w-5 shrink-0 text-[#c6f36b]" /><div><p className="font-semibold text-white">Reservas simples</p><p className="mt-1 text-sm text-[#929d90]">Confirmación inmediata desde cualquier dispositivo.</p></div></div></div></section>
    </>
  );
}

function AdminPage() {
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('barbershop-admin-token') ?? '');
  const isLoggedIn = Boolean(adminToken);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    isAvailable: true,
  });
  const [barberForm, setBarberForm] = useState({
    name: '',
    specialty: '',
    isActive: true,
  });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);

  async function loadAdminData() {
    if (!adminToken) return;
    const [serviceData, barberData, bookingData, summaryData] = await Promise.all([
      apiRequest<Service[]>('/api/services'),
      adminRequest<Barber[]>('/api/barbers', adminToken),
      adminRequest<BookingRecord[]>('/api/bookings', adminToken),
      adminRequest<Summary>('/api/admin/summary', adminToken),
    ]);

    setServices(serviceData);
    setBarbers(barberData);
    setBookings(bookingData);
    setSummary(summaryData);
  }

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    void loadAdminData();
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken) return;
    const events = new EventSource(`${API_BASE}/api/admin/events?token=${encodeURIComponent(adminToken)}`);
    const refresh = () => void loadAdminData();
    events.addEventListener('booking-created', refresh);
    events.addEventListener('booking-updated', refresh);
    const fallbackRefresh = window.setInterval(refresh, 20_000);
    return () => { events.close(); window.clearInterval(fallbackRefresh); };
  }, [adminToken]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    try {
      const response = await apiRequest<{ ok: boolean; token: string }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      sessionStorage.setItem('barbershop-admin-token', response.token);
      setAdminToken(response.token);
      setLoginError('');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Error de autenticación.');
    }
  }

  async function handleServiceSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      name: serviceForm.name,
      description: serviceForm.description,
      price: Number(serviceForm.price),
      duration: Number(serviceForm.duration),
      isAvailable: serviceForm.isAvailable,
    };

    if (!payload.name || !payload.price || !payload.duration) {
      return;
    }

    const path = editingServiceId ? `/api/services/${editingServiceId}` : '/api/services';
    const method = editingServiceId ? 'PUT' : 'POST';

    await adminRequest<Service>(path, adminToken, {
      method,
      body: JSON.stringify(payload),
    });

    setServiceForm({ name: '', description: '', price: '', duration: '', isAvailable: true });
    setEditingServiceId(null);
    await loadAdminData();
  }

  async function handleDeleteService(serviceId: string) {
    await adminRequest(`/api/services/${serviceId}`, adminToken, { method: 'DELETE' });
    await loadAdminData();
  }

  async function handleServiceToggle(service: Service) {
    await adminRequest<Service>(`/api/services/${service.id}`, adminToken, {
      method: 'PUT',
      body: JSON.stringify({ isAvailable: !service.isAvailable }),
    });
    await loadAdminData();
  }

  async function handleBarberSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      name: barberForm.name,
      specialty: barberForm.specialty,
      isActive: barberForm.isActive,
    };

    if (!payload.name.trim()) {
      return;
    }

    const path = editingBarberId ? `/api/barbers/${editingBarberId}` : '/api/barbers';
    const method = editingBarberId ? 'PUT' : 'POST';

    await adminRequest<Barber>(path, adminToken, {
      method,
      body: JSON.stringify(payload),
    });

    setBarberForm({ name: '', specialty: '', isActive: true });
    setEditingBarberId(null);
    await loadAdminData();
  }

  async function handleDeleteBarber(barberId: string) {
    await adminRequest(`/api/barbers/${barberId}`, adminToken, { method: 'DELETE' });
    await loadAdminData();
  }

  async function handleBookingAssignment(bookingId: string, barberId: string) {
    const chosenBarber = barbers.find((barber) => barber.id === barberId);

    await adminRequest(`/api/bookings/${bookingId}`, adminToken, {
      method: 'PUT',
      body: JSON.stringify({
        barberId: barberId === 'Sin asignar' ? null : barberId,
        barberName: chosenBarber ? chosenBarber.name : 'Sin asignar',
      }),
    });
    await loadAdminData();
  }

  async function handleCancelBooking(booking: BookingRecord) {
    await adminRequest(`/api/bookings/${booking.id}/cancel`, adminToken, {
      method: 'POST',
      body: JSON.stringify({ cancelCode: booking.cancelCode }),
    });
    await loadAdminData();
  }

  if (!isLoggedIn) {
    return (
      <section id="admin" className="mx-auto mt-8 max-w-7xl px-4 sm:px-8">
        <div className="rounded-3xl border border-border bg-card/80 p-4 sm:p-6">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-muted/30 p-6">
          <div className="mb-4 flex items-center gap-2 text-amber-300">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="text-xl font-semibold text-white">Acceso de administrador</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Contraseña</Label>
              <Input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresa la contraseña" />
            </div>

            {loginError ? <p className="text-sm text-red-300">{loginError}</p> : null}

            <Button type="submit" className="w-full">Entrar al panel</Button>
          </form>
        </div>
        </div>
      </section>
    );
  }

  return (
    <section id="admin" className="mx-auto mt-8 max-w-7xl space-y-6 px-4 sm:px-8">
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card/80 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Panel de administración</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Gestión del salón</h2>
        </div>
        <Button variant="outline" onClick={() => { sessionStorage.removeItem('barbershop-admin-token'); setAdminToken(''); }}>
          Cerrar sesión
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card/80">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Ingresos</p>
              <p className="mt-2 text-2xl font-bold text-white">{summary ? currencyFormatter.format(summary.totalRevenue) : '$0'}</p>
            </div>
            <CreditCard className="h-8 w-8 text-amber-300" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Reservas</p>
              <p className="mt-2 text-2xl font-bold text-white">{summary?.totalBookings ?? 0}</p>
            </div>
            <CalendarDays className="h-8 w-8 text-amber-300" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Servicios activos</p>
              <p className="mt-2 text-2xl font-bold text-white">{summary?.activeServices ?? 0}</p>
            </div>
            <Scissors className="h-8 w-8 text-amber-300" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Próximas</p>
              <p className="mt-2 text-2xl font-bold text-white">{summary?.upcomingBookings ?? 0}</p>
            </div>
            <Clock3 className="h-8 w-8 text-amber-300" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
        <Card className="border-border bg-card/80">
          <CardHeader>
            <CardTitle>{editingServiceId ? 'Editar servicio' : 'Crear servicio'}</CardTitle>
            <CardDescription>Configura nombre, precio y disponibilidad del tratamiento.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service-name">Nombre</Label>
                <Input id="service-name" value={serviceForm.name} onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-description">Descripción</Label>
                <Input id="service-description" value={serviceForm.description} onChange={(event) => setServiceForm((current) => ({ ...current, description: event.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="service-price">Precio</Label>
                  <Input id="service-price" type="number" min="0" value={serviceForm.price} onChange={(event) => setServiceForm((current) => ({ ...current, price: event.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-duration">Duración (min)</Label>
                  <Input id="service-duration" type="number" min="15" step="5" value={serviceForm.duration} onChange={(event) => setServiceForm((current) => ({ ...current, duration: event.target.value }))} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={serviceForm.isAvailable}
                  onChange={(event) => setServiceForm((current) => ({ ...current, isAvailable: event.target.checked }))}
                />
                Disponible para reservas
              </label>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{editingServiceId ? 'Guardar cambios' : 'Crear servicio'}</Button>
                {editingServiceId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingServiceId(null);
                      setServiceForm({ name: '', description: '', price: '', duration: '', isAvailable: true });
                    }}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardHeader>
            <CardTitle>Servicios</CardTitle>
            <CardDescription>Activa o desactiva tratamientos y edita sus detalles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.map((service) => (
              <div key={service.id} className="rounded-2xl border border-border bg-muted/25 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-white">{service.name}</p>
                      <Badge variant={service.isAvailable ? 'success' : 'warning'}>{service.isAvailable ? 'Activo' : 'Inactivo'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{service.description ?? 'Servicio sin descripción.'}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingServiceId(service.id); setServiceForm({ name: service.name, description: service.description ?? '', price: String(service.price), duration: String(service.duration), isAvailable: service.isAvailable }); }}>
                      Editar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void handleServiceToggle(service)}>
                      {service.isAvailable ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void handleDeleteService(service.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{service.duration} min</span>
                  <span>{currencyFormatter.format(service.price)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/80">
        <CardHeader>
          <div className="flex items-center gap-2 text-amber-300">
            <Sparkles className="h-5 w-5" />
            <CardTitle>Barberos</CardTitle>
          </div>
          <CardDescription>Administra el equipo de trabajo y sus especialidades.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={handleBarberSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barber-name">Nombre</Label>
              <Input id="barber-name" value={barberForm.name} onChange={(event) => setBarberForm((current) => ({ ...current, name: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barber-specialty">Especialidad</Label>
              <Input id="barber-specialty" value={barberForm.specialty} onChange={(event) => setBarberForm((current) => ({ ...current, specialty: event.target.value }))} placeholder="Ej. Corte y barba" />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={barberForm.isActive}
                onChange={(event) => setBarberForm((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Barbero activo
            </label>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">{editingBarberId ? 'Guardar barbero' : 'Crear barbero'}</Button>
              {editingBarberId ? (
                <Button type="button" variant="outline" onClick={() => { setEditingBarberId(null); setBarberForm({ name: '', specialty: '', isActive: true }); }}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>

          <div className="space-y-3">
            {barbers.map((barber) => (
              <div key={barber.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{barber.name}</p>
                      <Badge variant={barber.isActive ? 'success' : 'warning'}>{barber.isActive ? 'Activo' : 'Inactivo'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{barber.specialty || 'Sin especialidad definida.'}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingBarberId(barber.id); setBarberForm({ name: barber.name, specialty: barber.specialty ?? '', isActive: barber.isActive }); }}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void handleDeleteBarber(barber.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/80">
        <CardHeader>
          <div className="flex items-center gap-2 text-amber-300">
            <Sparkles className="h-5 w-5" />
            <CardTitle>Reservas y asignación</CardTitle>
          </div>
          <CardDescription>Consulta, asigna barberos y gestiona las citas del día.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-amber-300" />
                    <p className="font-medium text-white">{booking.customerName}</p>
                    <Badge variant={booking.status === 'cancelled' ? 'danger' : 'success'}>{booking.status === 'cancelled' ? 'Cancelada' : 'Confirmada'}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{booking.service.name} · {new Date(booking.scheduledAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={booking.barberId ?? 'Sin asignar'}
                    onChange={(event) => void handleBookingAssignment(booking.id, event.target.value)}
                    className="flex h-9 rounded-md border border-border bg-muted px-2 text-sm text-foreground"
                  >
                    <option value="Sin asignar">Sin asignar</option>
                    {barbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>{barber.name}</option>
                    ))}
                  </select>

                  {booking.status !== 'cancelled' ? (
                    <Button size="sm" variant="outline" onClick={() => void handleCancelBooking(booking)}>
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border bg-card/80">
        <CardHeader>
          <CardTitle>Ingresos semanales</CardTitle>
          <CardDescription>Resumen de ganancias por día.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {summary ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="day" stroke="#cbd5e1" />
                <YAxis tickFormatter={(value) => `$${Number(value).toLocaleString('es-AR')}`} stroke="#cbd5e1" />
                <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
                <Bar dataKey="total" fill="#fbbf24" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Cargando gráfico...</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default App;
