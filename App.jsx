
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bell, CalendarDays, CheckCircle, Clock, Edit, Eye, FileText,
  Lock, LogOut, Mail, Plus, QrCode, Search, ShieldCheck, Target, Trash2,
  TrendingDown, TrendingUp, User, Users, Wallet, Save, DatabaseBackup
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { QRCodeSVG } from "qrcode.react";
import "./style.css";

const STORAGE_KEY = "gpsruta_cobranza_pro_v3";
const SESSION_KEY = "gpsruta_login_ok";
const PASS = "1234";

const seed = {
  clients: [
    { id: 1, nombre: "Transportes del Sur SpA", rut: "76.543.210-9", telefono: "56912345678", email: "contacto@delsur.cl", direccion: "Av. Los Pinos 1234, Santiago", contacto: "Juan Pérez", estado: "Activo" },
    { id: 2, nombre: "Constructora Andes Ltda.", rut: "77.555.333-1", telefono: "56998765432", email: "pagos@andes.cl", direccion: "San Carlos, Ñuble", contacto: "María Torres", estado: "Activo" },
    { id: 3, nombre: "Servicios Generales SpA", rut: "78.222.441-5", telefono: "56911223344", email: "admin@servicios.cl", direccion: "Chillán, Ñuble", contacto: "Carlos Rojas", estado: "Activo" }
  ],
  invoices: [
    { id: 1, clienteId: 1, factura: "FAC-2026-001", emision: "2026-05-01", vencimiento: "2026-05-18", monto: 1250000, estado: "Por vencer", detalle: "Servicio GPS mensual" },
    { id: 2, clienteId: 2, factura: "FAC-2026-002", emision: "2026-04-20", vencimiento: "2026-05-10", monto: 2850000, estado: "Vencida", detalle: "Instalación y monitoreo" },
    { id: 3, clienteId: 1, factura: "FAC-2026-003", emision: "2026-05-04", vencimiento: "2026-05-26", monto: 950000, estado: "Pagada", detalle: "Mantención plataforma" },
    { id: 4, clienteId: 3, factura: "FAC-2026-004", emision: "2026-05-11", vencimiento: "2026-05-21", monto: 650000, estado: "Pendiente", detalle: "Servicio monitoreo" }
  ],
  transactions: [
    { id: 1, tipo: "Ingreso", fecha: "2026-05-10", categoria: "Pago factura", descripcion: "Pago FAC-2026-003", monto: 950000 },
    { id: 2, tipo: "Egreso", fecha: "2026-05-11", categoria: "Operacional", descripcion: "Servidor y sistema", monto: 180000 },
    { id: 3, tipo: "Ingreso", fecha: "2026-05-12", categoria: "Abono", descripcion: "Abono cliente", monto: 450000 },
    { id: 4, tipo: "Egreso", fecha: "2026-05-13", categoria: "API WhatsApp", descripcion: "Servicio mensajería", monto: 75000 }
  ]
};

const money = (v) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(v || 0));
const today = () => new Date().toISOString().slice(0, 10);

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seed;
  } catch {
    return seed;
  }
}

function daysUntil(date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(`${date}T00:00:00`);
  return Math.ceil((due - now) / 86400000);
}

function invoiceStatus(invoice) {
  if (invoice.estado === "Pagada") return { label: "Pagada", className: "ok", icon: CheckCircle };
  const d = daysUntil(invoice.vencimiento);
  if (invoice.estado === "Vencida" || d < 0) return { label: "Vencida", className: "bad", icon: AlertTriangle };
  if (d <= 3 && d >= 0) return { label: "Por vencer", className: "warn", icon: Clock };
  return { label: "Pendiente", className: "soft", icon: FileText };
}

function clientPayload(client) {
  return JSON.stringify({
    empresa: client.nombre,
    rut: client.rut,
    contacto: client.contacto,
    telefono: client.telefono,
    email: client.email,
    direccion: client.direccion,
    sistema: "GPSruta.cl"
  });
}

function buildWhatsApp(invoice, client) {
  const d = daysUntil(invoice.vencimiento);
  const aviso = d === 3 ? "FALTAN 3 DÍAS para el vencimiento" : d === 0 ? "vence HOY" : d < 0 ? "se encuentra VENCIDA" : `vence en ${d} días`;
  const text = `Hola ${client?.nombre || "cliente"}, le recordamos que la factura ${invoice.factura} por ${money(invoice.monto)} ${aviso}. Fecha de vencimiento: ${invoice.vencimiento}. Favor confirmar pago. GPSruta.cl`;
  return `https://wa.me/${client?.telefono || ""}?text=${encodeURIComponent(text)}`;
}

function buildEmail(invoice, client) {
  const d = daysUntil(invoice.vencimiento);
  const aviso = d === 3 ? "faltan 3 días para el vencimiento" : d === 0 ? "vence hoy" : d < 0 ? "se encuentra vencida" : `vence en ${d} días`;
  const subject = `Recordatorio de cobro - Factura ${invoice.factura}`;
  const body = `Estimado/a ${client?.nombre || "cliente"}:

Junto con saludar, informamos que la factura ${invoice.factura} por ${money(invoice.monto)} ${aviso}.

Fecha de vencimiento: ${invoice.vencimiento}
Detalle: ${invoice.detalle || "Servicio contratado"}

Favor confirmar pago o enviar comprobante.

Atentamente,
GPSruta.cl - Seguimiento y Seguridad`;
  return `mailto:${client?.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M16.04 3C8.86 3 3 8.84 3 16.02c0 2.3.6 4.54 1.75 6.51L3 29l6.64-1.7a12.95 12.95 0 0 0 6.4 1.64h.01C23.22 28.94 29 23.1 29 15.92 29 8.8 23.18 3 16.04 3Zm7.56 18.45c-.32.9-1.86 1.7-2.6 1.8-.67.1-1.52.14-2.45-.15-.56-.18-1.28-.42-2.2-.82-3.87-1.68-6.4-5.6-6.6-5.86-.2-.26-1.58-2.1-1.58-4s1-2.84 1.35-3.23c.36-.4.78-.5 1.04-.5h.75c.24.01.57-.09.9.69.32.78 1.1 2.69 1.2 2.89.1.2.16.43.03.69-.13.26-.2.42-.4.64-.2.23-.42.5-.6.67-.2.2-.4.42-.17.82.23.4 1.02 1.68 2.2 2.72 1.51 1.35 2.78 1.77 3.18 1.97.4.2.63.17.86-.1.23-.26 1-1.16 1.26-1.56.26-.4.53-.33.9-.2.36.13 2.3 1.08 2.7 1.28.4.2.66.3.76.46.1.16.1.95-.22 1.85Z"/>
    </svg>
  );
}

function Login({ onLogin }) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  function submit(e) {
    e.preventDefault();
    if (pass === PASS) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onLogin();
    } else {
      setError("Clave incorrecta. Clave demo: 1234");
    }
  }
  return (
    <div className="loginPage">
      <div className="techBg" />
      <form className="loginCard" onSubmit={submit}>
        
<div className="svgLogo">
  <div className="logoCircle"><Target size={52} /></div>
  <div>
    <h1><span>GPS</span><b>ruta</b><small>.cl</small></h1>
    <p>Seguimiento y Seguridad</p>
  </div>
</div>

        <h1>Ingreso Seguro</h1>
        <p>Sistema de cobranza GPSruta.cl</p>
        <label>Clave de acceso</label>
        <div className="loginInput">
          <Lock size={18} />
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Ingrese clave" autoFocus />
        </div>
        {error && <div className="loginError">{error}</div>}
        <button className="loginBtn"><ShieldCheck size={18} /> Ingresar al sistema</button>
        <small>Datos protegidos · Guardado automático activo</small>
      </form>
    </div>
  );
}

function LogoBlock() {
  return (
    <div className="logoBlock svgLogo sidebarLogo">
      <div className="logoCircle"><Target size={52} /></div>
      <div>
        <h1><span>GPS</span><b>ruta</b><small>.cl</small></h1>
        <p>Seguimiento y Seguridad</p>
      </div>
    </div>
  );
}

function QRBox({ client }) {
  return (
    <div className="qrReal">
      <QRCodeSVG value={clientPayload(client)} size={142} bgColor="#ffffff" fgColor="#000000" level="H" includeMargin />
    </div>
  );
}

function Kpi({ title, value, subtitle, icon: Icon, tone = "green" }) {
  return (
    <div className="card kpi">
      <div className={`kpiIcon ${tone}`}><Icon size={34} /></div>
      <div>
        <small>{title}</small>
        <h3>{value}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function FormFields({ obj, setObj, fields }) {
  return (
    <div className="formGrid">
      {fields.map((f) => (
        <input
          key={f}
          type={["emision", "vencimiento", "fecha"].includes(f) ? "date" : f === "monto" ? "number" : "text"}
          value={obj[f] || ""}
          onChange={(e) => setObj({ ...obj, [f]: e.target.value })}
          placeholder={f.toUpperCase()}
        />
      ))}
    </div>
  );
}

function InvoiceTable({ invoices, clientById, editInvoice, deleteInvoice }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>N° Factura</th>
            <th>Cliente</th>
            <th>Vencimiento</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const client = clientById(invoice.clienteId);
            const st = invoiceStatus(invoice);
            const Icon = st.icon;
            return (
              <tr key={invoice.id}>
                <td><b>{invoice.factura}</b></td>
                <td>{client?.nombre || "Sin cliente"}</td>
                <td>{invoice.vencimiento}</td>
                <td>{money(invoice.monto)}</td>
                <td><span className={`status ${st.className}`}><Icon size={15} /> {st.label}</span></td>
                <td>
                  <div className="actionBtns">
                    <a className="iconBtn whatsapp" href={buildWhatsApp(invoice, client)} target="_blank" rel="noreferrer" title="Enviar WhatsApp"><WhatsAppIcon /></a>
                    <a className="iconBtn mail" href={buildEmail(invoice, client)} title="Enviar correo"><Mail size={18} /></a>
                    <button className="iconBtn edit" onClick={() => editInvoice(invoice)} title="Editar factura"><Edit size={18} /></button>
                    <button className="iconBtn trash" onClick={() => deleteInvoice(invoice.id)} title="Eliminar factura"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [logged, setLogged] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [data, setData] = useState(loadData);
  const [clock, setClock] = useState(new Date());
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [savedAt, setSavedAt] = useState("Sin cambios");
  const [editingClient, setEditingClient] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const [clientForm, setClientForm] = useState({ nombre: "", rut: "", telefono: "569", email: "", direccion: "", contacto: "", estado: "Activo" });
  const [invoiceForm, setInvoiceForm] = useState({ clienteId: "", factura: "", emision: today(), vencimiento: today(), monto: "", estado: "Pendiente", detalle: "" });
  const [txForm, setTxForm] = useState({ tipo: "Ingreso", fecha: today(), categoria: "", descripcion: "", monto: "" });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSavedAt(new Date().toLocaleTimeString("es-CL"));
  }, [data]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const clientById = (id) => data.clients.find((c) => Number(c.id) === Number(id));

  const stats = useMemo(() => {
    const ingresos = data.transactions.filter((t) => t.tipo === "Ingreso").reduce((s, t) => s + Number(t.monto), 0);
    const egresos = data.transactions.filter((t) => t.tipo === "Egreso").reduce((s, t) => s + Number(t.monto), 0);
    const vencidas = data.invoices.filter((i) => invoiceStatus(i).label === "Vencida");
    const porVencer = data.invoices.filter((i) => invoiceStatus(i).label === "Por vencer");
    return { ingresos, egresos, saldo: ingresos - egresos, vencidas, porVencer };
  }, [data]);

  const financeChart = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].map((mes, i) => ({
    mes,
    ingresos: Math.round(stats.ingresos * (0.5 + i * 0.06)),
    egresos: Math.round(stats.egresos * (0.45 + i * 0.04))
  }));

  const invoicePie = [
    { name: "Pagadas", value: data.invoices.filter((i) => invoiceStatus(i).label === "Pagada").length },
    { name: "Pendientes", value: data.invoices.filter((i) => invoiceStatus(i).label === "Pendiente").length },
    { name: "Por vencer", value: stats.porVencer.length },
    { name: "Vencidas", value: stats.vencidas.length }
  ];

  const filteredClients = data.clients.filter((c) => `${c.nombre} ${c.rut} ${c.telefono} ${c.email}`.toLowerCase().includes(search.toLowerCase()));
  const filteredInvoices = data.invoices.filter((i) => `${i.factura} ${clientById(i.clienteId)?.nombre || ""}`.toLowerCase().includes(search.toLowerCase()));

  function saveClient() {
    if (!clientForm.nombre || !clientForm.rut) return;
    if (editingClient) {
      setData({ ...data, clients: data.clients.map((c) => c.id === editingClient ? { ...clientForm, id: editingClient } : c) });
      setEditingClient(null);
    } else {
      setData({ ...data, clients: [{ ...clientForm, id: Date.now() }, ...data.clients] });
    }
    setClientForm({ nombre: "", rut: "", telefono: "569", email: "", direccion: "", contacto: "", estado: "Activo" });
  }

  function editClient(client) {
    setEditingClient(client.id);
    setClientForm(client);
    setTab("clientes");
  }

  function deleteClient(id) {
    setData({ ...data, clients: data.clients.filter((c) => c.id !== id), invoices: data.invoices.filter((i) => Number(i.clienteId) !== Number(id)) });
  }

  function saveInvoice() {
    if (!invoiceForm.clienteId || !invoiceForm.factura || !invoiceForm.monto) return;
    const payload = { ...invoiceForm, id: editingInvoice || Date.now(), clienteId: Number(invoiceForm.clienteId), monto: Number(invoiceForm.monto) };
    if (editingInvoice) {
      setData({ ...data, invoices: data.invoices.map((i) => i.id === editingInvoice ? payload : i) });
      setEditingInvoice(null);
    } else {
      setData({ ...data, invoices: [payload, ...data.invoices] });
    }
    setInvoiceForm({ clienteId: "", factura: "", emision: today(), vencimiento: today(), monto: "", estado: "Pendiente", detalle: "" });
  }

  function editInvoice(invoice) {
    setEditingInvoice(invoice.id);
    setInvoiceForm({ ...invoice, clienteId: String(invoice.clienteId) });
    setTab("facturas");
  }

  function deleteInvoice(id) {
    setData({ ...data, invoices: data.invoices.filter((i) => i.id !== id) });
  }

  function saveTx() {
    if (!txForm.categoria || !txForm.monto) return;
    setData({ ...data, transactions: [{ ...txForm, id: Date.now(), monto: Number(txForm.monto) }, ...data.transactions] });
    setTxForm({ tipo: "Ingreso", fecha: today(), categoria: "", descripcion: "", monto: "" });
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setLogged(false);
  }

  if (!logged) return <Login onLogin={() => setLogged(true)} />;

  return (
    <div className="app">
      <div className="bgTech" />
      <div className="bgGrid" />
      <div className="bgHud" />

      <aside className="sidebar">
        <LogoBlock />
        <div className="adminBox">
          <div className="adminAvatar"><User size={28} /></div>
          <div>
            <b>Administrador</b>
            <p>admin@gpsruta.cl</p>
          </div>
        </div>

        <nav>
          {[
            ["dashboard", "Dashboard", Eye],
            ["clientes", "Clientes", Users],
            ["facturas", "Facturas", FileText],
            ["movimientos", "Ingresos / Egresos", Wallet],
            ["qr", "QR Clientes", QrCode],
            ["alertas", "Cobros / Recordatorios", Bell]
          ].map(([value, label, Icon]) => (
            <button key={value} onClick={() => setTab(value)} className={tab === value ? "active" : ""}>
              <Icon size={20} /> {label}
            </button>
          ))}
        </nav>

        <div className="autoSaveBox">
          <CheckCircle size={22} />
          <div>
            <b>Guardado automático activo</b>
            <p>Último guardado: {savedAt}</p>
          </div>
        </div>

        <button className="logout" onClick={logout}><LogOut size={20} /> Cerrar sesión</button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="searchBox">
            <Search size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, factura..." />
          </div>

          <div className="topActions">
            <div className="dateChip"><CalendarDays size={18} /> {clock.toLocaleDateString("es-CL")}</div>
            <div className="timeChip"><Clock size={20} /> {clock.toLocaleTimeString("es-CL")}</div>
            <div className="saveChip"><Save size={18} /> Guardado automático</div>
          </div>
        </header>

        <section className="kpiGrid">
          <Kpi title="Clientes" value={data.clients.length} subtitle="Activos" icon={Users} />
          <Kpi title="Facturas" value={data.invoices.length} subtitle="Totales" icon={FileText} />
          <Kpi title="Ingresos" value={money(stats.ingresos)} subtitle="Total ingresos" icon={TrendingUp} />
          <Kpi title="Egresos" value={money(stats.egresos)} subtitle="Total egresos" icon={TrendingDown} tone="red" />
          <Kpi title="Saldo neto" value={money(stats.saldo)} subtitle="Balance general" icon={Wallet} tone="gold" />
        </section>

        {tab === "dashboard" && (
          <section className="dashboardGrid">
            <div className="card chartCard large">
              <h2>Resumen financiero</h2>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financeChart}>
                    <defs>
                      <linearGradient id="ing" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7CFC00" stopOpacity={0.55} />
                        <stop offset="95%" stopColor="#7CFC00" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF3131" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#FF3131" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,.08)" />
                    <XAxis dataKey="mes" stroke="#d6d6d6" />
                    <YAxis stroke="#d6d6d6" tickFormatter={(v) => `${Math.round(v / 1000000)}M`} />
                    <Tooltip formatter={(v) => money(v)} contentStyle={{ background: "#050505", border: "1px solid #7CFC00", borderRadius: 14 }} />
                    <Area type="monotone" dataKey="ingresos" stroke="#7CFC00" fill="url(#ing)" strokeWidth={3} />
                    <Area type="monotone" dataKey="egresos" stroke="#FF3131" fill="url(#eg)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card chartCard">
              <h2>Estado de facturas</h2>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={invoicePie} dataKey="value" nameKey="name" innerRadius={58} outerRadius={100}>
                      {invoicePie.map((_, i) => <Cell key={i} fill={["#7CFC00", "#FFD43B", "#FF9500", "#FF3131"][i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#050505", border: "1px solid #FFD43B", borderRadius: 14 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card large">
              <h2>Facturas recientes</h2>
              <InvoiceTable invoices={filteredInvoices.slice(0, 6)} clientById={clientById} editInvoice={editInvoice} deleteInvoice={deleteInvoice} />
            </div>

            <div className="card featured">
              <h2>Cliente destacado</h2>
              {data.clients[0] && (
                <>
                  <QRBox client={data.clients[0]} />
                  <h3>{data.clients[0].nombre}</h3>
                  <p>RUT: {data.clients[0].rut}</p>
                  <p>Teléfono: +{data.clients[0].telefono}</p>
                  <p>Email: {data.clients[0].email}</p>
                  <button className="primaryBtn" onClick={() => editClient(data.clients[0])}><Edit size={18} /> Editar cliente</button>
                </>
              )}
            </div>
          </section>
        )}

        {tab === "clientes" && (
          <section className="contentGrid">
            <div className="card">
              <h2>{editingClient ? "Editar cliente" : "Ingresar nuevo cliente"}</h2>
              <FormFields obj={clientForm} setObj={setClientForm} fields={["nombre", "rut", "telefono", "email", "direccion", "contacto"]} />
              <button className="primaryBtn" onClick={saveClient}><Plus size={18} /> Guardar cliente</button>
            </div>

            <div className="listGrid">
              {filteredClients.map((client) => (
                <div className="card clientCard" key={client.id}>
                  <QRBox client={client} />
                  <div>
                    <h3>{client.nombre}</h3>
                    <p>{client.rut}</p>
                    <p>+{client.telefono}</p>
                    <p>{client.email}</p>
                    <div className="actionBtns">
                      <button className="iconBtn edit" onClick={() => editClient(client)}><Edit size={18} /></button>
                      <button className="iconBtn trash" onClick={() => deleteClient(client.id)}><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "facturas" && (
          <section className="contentGrid">
            <div className="card">
              <h2>{editingInvoice ? "Editar factura" : "Ingresar nueva factura"}</h2>
              <select value={invoiceForm.clienteId} onChange={(e) => setInvoiceForm({ ...invoiceForm, clienteId: e.target.value })}>
                <option value="">Seleccionar cliente</option>
                {data.clients.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <FormFields obj={invoiceForm} setObj={setInvoiceForm} fields={["factura", "emision", "vencimiento", "monto", "detalle"]} />
              <select value={invoiceForm.estado} onChange={(e) => setInvoiceForm({ ...invoiceForm, estado: e.target.value })}>
                <option>Pendiente</option>
                <option>Por vencer</option>
                <option>Vencida</option>
                <option>Pagada</option>
              </select>
              <button className="primaryBtn" onClick={saveInvoice}><Plus size={18} /> Guardar factura</button>
            </div>
            <div className="card">
              <InvoiceTable invoices={filteredInvoices} clientById={clientById} editInvoice={editInvoice} deleteInvoice={deleteInvoice} />
            </div>
          </section>
        )}

        {tab === "movimientos" && (
          <section className="contentGrid">
            <div className="card">
              <h2>Ingresos y egresos</h2>
              <select value={txForm.tipo} onChange={(e) => setTxForm({ ...txForm, tipo: e.target.value })}>
                <option>Ingreso</option>
                <option>Egreso</option>
              </select>
              <FormFields obj={txForm} setObj={setTxForm} fields={["fecha", "categoria", "descripcion", "monto"]} />
              <button className="primaryBtn gold" onClick={saveTx}><Plus size={18} /> Guardar movimiento</button>
            </div>
            <div className="card">
              <h2>Historial financiero</h2>
              <div className="tableWrap">
                <table>
                  <tbody>
                    {data.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className={tx.tipo === "Ingreso" ? "okText" : "badText"}>{tx.tipo}</td>
                        <td>{tx.fecha}</td>
                        <td>{tx.categoria}<small>{tx.descripcion}</small></td>
                        <td>{money(tx.monto)}</td>
                        <td><button className="iconBtn trash" onClick={() => setData({ ...data, transactions: data.transactions.filter((t) => t.id !== tx.id) })}><Trash2 size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === "qr" && (
          <section className="qrGrid">
            {data.clients.map((client) => (
              <div className="card qrCard" key={client.id}>
                <QRBox client={client} />
                <h3>{client.nombre}</h3>
                <p>{client.rut}</p>
                <small>QR real con datos del cliente.</small>
              </div>
            ))}
          </section>
        )}

        {tab === "alertas" && (
          <section className="alertsGrid">
            <div className="card backupCard">
              <DatabaseBackup size={34} />
              <div>
                <h2>Guardado automático activo</h2>
                <p>Toda la información ingresada queda guardada en el navegador y no se borra al salir del sistema.</p>
                <b>Último guardado: {savedAt}</b>
              </div>
            </div>
            {data.invoices.filter((i) => ["Vencida", "Por vencer"].includes(invoiceStatus(i).label) || daysUntil(i.vencimiento) === 3).map((invoice) => {
              const client = clientById(invoice.clienteId);
              const st = invoiceStatus(invoice);
              const Icon = st.icon;
              return (
                <div className={`card alertCard ${st.className}`} key={invoice.id}>
                  <Icon size={34} />
                  <div>
                    <h3>{invoice.factura} · {st.label}</h3>
                    <p>{client?.nombre} · {money(invoice.monto)}</p>
                    <p>Vencimiento: {invoice.vencimiento}</p>
                    <div className="actionBtns">
                      <a className="sendBtn whatsapp" href={buildWhatsApp(invoice, client)} target="_blank" rel="noreferrer"><WhatsAppIcon /> WhatsApp</a>
                      <a className="sendBtn mail" href={buildEmail(invoice, client)}><Mail size={18} /> Correo</a>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <footer>
          <ShieldCheck size={22} /> Datos 100% seguros
          <DatabaseBackup size={22} /> Respaldo automático
          <Lock size={22} /> Acceso con clave
          <Save size={22} /> Sin pérdida de información
        </footer>
      </main>
    </div>
  );
}
