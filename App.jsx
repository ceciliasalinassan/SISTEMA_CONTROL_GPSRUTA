
import React,{useEffect,useMemo,useState}from"react";
import{Bell,CalendarDays,CheckCircle,Clock,FileText,MessageCircle,Plus,QrCode,Search,Target,Trash2,TrendingDown,TrendingUp,Users,Wallet,AlertTriangle,Edit}from"lucide-react";
import{LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid,PieChart,Pie,Cell}from"recharts";
import"./style.css";

const KEY="gpsruta_sistema_cobranza_v_final";
const seed={clients:[
{id:1,nombre:"Transportes del Sur SpA",rut:"76.543.210-9",telefono:"56912345678",email:"contacto@delsur.cl",direccion:"Av. Los Pinos 1234",contacto:"Juan Pérez"},
{id:2,nombre:"Constructora Andes Ltda.",rut:"77.555.333-1",telefono:"56998765432",email:"pagos@andes.cl",direccion:"San Carlos, Ñuble",contacto:"María Torres"}],
invoices:[
{id:1,clienteId:1,factura:"FAC-2026-001",emision:"2026-05-01",vencimiento:"2026-05-18",monto:1250000,estado:"Por vencer",detalle:"Servicio GPS mensual"},
{id:2,clienteId:2,factura:"FAC-2026-002",emision:"2026-04-20",vencimiento:"2026-05-10",monto:2850000,estado:"Vencida",detalle:"Instalación y monitoreo"},
{id:3,clienteId:1,factura:"FAC-2026-003",emision:"2026-05-04",vencimiento:"2026-05-26",monto:950000,estado:"Pagada",detalle:"Mantención plataforma"}],
tx:[{id:1,tipo:"Ingreso",fecha:"2026-05-10",categoria:"Pago factura",descripcion:"Pago FAC-2026-003",monto:950000},{id:2,tipo:"Egreso",fecha:"2026-05-11",categoria:"Operacional",descripcion:"Servidor",monto:180000}]};

const money=v=>new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(+v||0);
const today=()=>new Date().toISOString().slice(0,10);
function days(d){let a=new Date();a.setHours(0,0,0,0);return Math.ceil((new Date(d+"T00:00:00")-a)/86400000)}
function status(i){if(i.estado==="Pagada")return["Pagada","ok",CheckCircle];let d=days(i.vencimiento);if(i.estado==="Vencida"||d<0)return["Vencida","bad",AlertTriangle];if(d<=3&&d>=0)return["Por vencer","warn",Clock];return["Pendiente","soft",FileText]}
function wa(i,c){let d=days(i.vencimiento),av=d===3?"FALTAN 3 DÍAS":d===0?"vence HOY":d<0?"está VENCIDA":`vence en ${d} días`;return`https://wa.me/${c?.telefono||""}?text=${encodeURIComponent(`Hola ${c?.nombre||"cliente"}, recordamos factura ${i.factura} por ${money(i.monto)}: ${av}. Vencimiento ${i.vencimiento}. GPSruta.cl`)}`}
function mail(i,c){let s=`Recordatorio de cobro - Factura ${i.factura}`,b=`Estimado/a ${c?.nombre||"cliente"}:\n\nRecordamos la factura ${i.factura} por ${money(i.monto)} con vencimiento ${i.vencimiento}.\n\nFavor confirmar pago.\n\nGPSruta.cl`;return`mailto:${c?.email||""}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}`}

function QR({text}){let ch=Array.from((text||"GPSRUTA")+"0000000000000000000");return <div className="qr">{Array.from({length:81}).map((_,i)=>{let co=(i<20&&i%9<3)||(i<27&&i%9>5)||(i>53&&i%9<3),on=co||((ch[i%ch.length].charCodeAt(0)+i*7)%3===0);return <span key={i} className={on?"on":""}/>})}</div>}
function Logo(){return <div className="logo"><div className="mark"><Target size={42}/></div><div><h2><span>GPS</span><b>ruta</b><small>.cl</small></h2><p>Seguimiento y Seguridad</p></div></div>}
function K({t,v,s,icon:Icon,red}){return <div className="card k"><div><small>{t}</small><h3>{v}</h3><p>{s}</p></div><Icon className={red?"red":""} size={34}/></div>}

export default function App(){
const[data,setData]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY))||seed}catch{return seed}});
const[clk,setClk]=useState(new Date()),[tab,setTab]=useState("dashboard"),[q,setQ]=useState("");
const[cf,setCf]=useState({nombre:"",rut:"",telefono:"569",email:"",direccion:"",contacto:""}),[editC,setEditC]=useState(null);
const[ff,setFf]=useState({clienteId:"",factura:"",emision:today(),vencimiento:today(),monto:"",estado:"Pendiente",detalle:""}),[editF,setEditF]=useState(null);
const[tf,setTf]=useState({tipo:"Ingreso",fecha:today(),categoria:"",descripcion:"",monto:""});
useEffect(()=>localStorage.setItem(KEY,JSON.stringify(data)),[data]);
useEffect(()=>{let t=setInterval(()=>setClk(new Date()),1000);return()=>clearInterval(t)},[]);
const client=id=>data.clients.find(c=>+c.id===+id);
const st=useMemo(()=>{let ing=data.tx.filter(x=>x.tipo==="Ingreso").reduce((a,b)=>a+ +b.monto,0),eg=data.tx.filter(x=>x.tipo==="Egreso").reduce((a,b)=>a+ +b.monto,0);return{ing,eg,sal:ing-eg,ven:data.invoices.filter(i=>status(i)[0]==="Vencida"),por:data.invoices.filter(i=>status(i)[0]==="Por vencer")}},[data]);
const chart=["Ene","Feb","Mar","Abr","May","Jun"].map((m,i)=>({mes:m,ingresos:Math.round(st.ing*(.6+i*.08)),egresos:Math.round(st.eg*(.5+i*.07))}));
const pie=[["Pagadas","ok"],["Pendientes","soft"],["Por vencer","warn"],["Vencidas","bad"]].map(([n,c])=>({name:n,value:data.invoices.filter(i=>status(i)[0]===n).length,c}));
const fc=data.clients.filter(c=>(c.nombre+c.rut+c.telefono).toLowerCase().includes(q.toLowerCase()));
const fi=data.invoices.filter(i=>(i.factura+(client(i.clienteId)?.nombre||"")).toLowerCase().includes(q.toLowerCase()));
function saveC(){if(!cf.nombre||!cf.rut)return;setData({...data,clients:editC?data.clients.map(c=>c.id===editC?{...cf,id:editC}:c):[{...cf,id:Date.now()},...data.clients]});setCf({nombre:"",rut:"",telefono:"569",email:"",direccion:"",contacto:""});setEditC(null)}
function saveF(){if(!ff.clienteId||!ff.factura||!ff.monto)return;let p={...ff,id:editF||Date.now(),clienteId:+ff.clienteId,monto:+ff.monto};setData({...data,invoices:editF?data.invoices.map(i=>i.id===editF?p:i):[p,...data.invoices]});setFf({clienteId:"",factura:"",emision:today(),vencimiento:today(),monto:"",estado:"Pendiente",detalle:""});setEditF(null)}
function saveT(){if(!tf.categoria||!tf.monto)return;setData({...data,tx:[{...tf,id:Date.now(),monto:+tf.monto},...data.tx]});setTf({tipo:"Ingreso",fecha:today(),categoria:"",descripcion:"",monto:""})}

return <div className="app"><div className="bg"/><div className="grid"/><aside><Logo/><nav>{["dashboard","clientes","facturas","movimientos","qr","alertas"].map(x=><button onClick={()=>setTab(x)} className={tab===x?"act":""} key={x}>{x}</button>)}</nav></aside><main>
<header><div><h1>Sistema Profesional de Cobranza</h1><p>GPSruta.cl · Facturas, clientes, WhatsApp, ingresos, egresos y QR.</p></div><div className="badges"><b><Clock size={16}/>{clk.toLocaleTimeString("es-CL")}</b><b><CalendarDays size={16}/>{clk.toLocaleDateString("es-CL")}</b></div></header>
<section className="kpis"><K t="Clientes" v={data.clients.length} s="Activos" icon={Users}/><K t="Facturas" v={data.invoices.length} s="Totales" icon={FileText}/><K t="Ingresos" v={money(st.ing)} s="Total ingresos" icon={TrendingUp}/><K t="Egresos" v={money(st.eg)} s="Total egresos" icon={TrendingDown} red/><K t="Saldo neto" v={money(st.sal)} s="Balance" icon={Wallet}/></section>
<div className="search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar..."/></div>

{tab==="dashboard"&&<section className="dash"><div className="card wide"><h2>Resumen financiero</h2><div className="chart"><ResponsiveContainer><LineChart data={chart}><CartesianGrid stroke="rgba(255,255,255,.08)"/><XAxis dataKey="mes" stroke="#ccc"/><YAxis stroke="#ccc"/><Tooltip contentStyle={{background:"#050505",border:"1px solid #FFD43B"}}/><Line dataKey="ingresos" stroke="#7CFC00" strokeWidth={3}/><Line dataKey="egresos" stroke="#FF3131" strokeWidth={3}/></LineChart></ResponsiveContainer></div></div><div className="card"><h2>Estado facturas</h2><div className="chart"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>{pie.map((p,i)=><Cell key={i} fill={["#7CFC00","#FFD43B","#FF9500","#FF3131"][i]}/>)}</Pie><Tooltip contentStyle={{background:"#050505",border:"1px solid #FFD43B"}}/></PieChart></ResponsiveContainer></div></div><div className="card wide"><h2>Facturas recientes</h2><Table inv={fi.slice(0,5)} client={client} data={data} setData={setData} setEditF={setEditF} setFf={setFf}/></div></section>}

{tab==="clientes"&&<section className="two"><div className="card"><h2>{editC?"Editar":"Nuevo"} cliente</h2><Form obj={cf} set={setCf} fields={["nombre","rut","telefono","email","direccion","contacto"]}/><button className="save" onClick={saveC}><Plus size={16}/>Guardar cliente</button></div><div className="list">{fc.map(c=><div className="card row" key={c.id}><QR text={JSON.stringify(c)}/><div><h3>{c.nombre}</h3><p>{c.rut}</p><p>+{c.telefono}</p><button onClick={()=>{setEditC(c.id);setCf(c)}}><Edit size={16}/></button><button onClick={()=>setData({...data,clients:data.clients.filter(x=>x.id!==c.id)})}><Trash2 size={16}/></button></div></div>)}</div></section>}

{tab==="facturas"&&<section className="two"><div className="card"><h2>{editF?"Editar":"Nueva"} factura</h2><select value={ff.clienteId} onChange={e=>setFf({...ff,clienteId:e.target.value})}><option value="">Cliente</option>{data.clients.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select><Form obj={ff} set={setFf} fields={["factura","emision","vencimiento","monto","detalle"]}/><select value={ff.estado} onChange={e=>setFf({...ff,estado:e.target.value})}><option>Pendiente</option><option>Por vencer</option><option>Vencida</option><option>Pagada</option></select><button className="save" onClick={saveF}><Plus size={16}/>Guardar factura</button></div><div className="card"><Table inv={fi} client={client} data={data} setData={setData} setEditF={setEditF} setFf={setFf}/></div></section>}

{tab==="movimientos"&&<section className="two"><div className="card"><h2>Ingresos y egresos</h2><select value={tf.tipo} onChange={e=>setTf({...tf,tipo:e.target.value})}><option>Ingreso</option><option>Egreso</option></select><Form obj={tf} set={setTf} fields={["fecha","categoria","descripcion","monto"]}/><button className="save gold" onClick={saveT}>Guardar movimiento</button></div><div className="card"><table><tbody>{data.tx.map(t=><tr key={t.id}><td className={t.tipo==="Ingreso"?"ok":"bad"}>{t.tipo}</td><td>{t.fecha}</td><td>{t.categoria}</td><td>{money(t.monto)}</td><td><button onClick={()=>setData({...data,tx:data.tx.filter(x=>x.id!==t.id)})}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div></section>}

{tab==="qr"&&<div className="qrgrid">{data.clients.map(c=><div className="card" key={c.id}><QR text={JSON.stringify(c)}/><h3>{c.nombre}</h3><p>{c.rut}</p></div>)}</div>}

{tab==="alertas"&&<div className="alerts">{data.invoices.filter(i=>["Vencida","Por vencer"].includes(status(i)[0])||days(i.vencimiento)===3).map(i=>{let c=client(i.clienteId),s=status(i),Icon=s[2];return <div className="card row" key={i.id}><Icon className={s[1]} size={34}/><div><h3>{i.factura} · {s[0]}</h3><p>{c?.nombre} · {money(i.monto)}</p><a className="save" href={wa(i,c)} target="_blank">WhatsApp</a><a className="save gold" href={mail(i,c)}>Correo</a></div></div>})}</div>}
</main></div>}

function Form({obj,set,fields}){return <div className="form">{fields.map(f=><input key={f} type={f.includes("fecha")||f.includes("emision")||f.includes("vencimiento")?"date":f==="monto"?"number":"text"} value={obj[f]} onChange={e=>set({...obj,[f]:e.target.value})} placeholder={f}/>)}</div>}
function Table({inv,client,data,setData,setEditF,setFf}){return <div className="table"><table><thead><tr><th>Factura</th><th>Cliente</th><th>Vence</th><th>Monto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{inv.map(i=>{let c=client(i.clienteId),s=status(i),Icon=s[2];return <tr key={i.id}><td>{i.factura}</td><td>{c?.nombre}</td><td>{i.vencimiento}</td><td>{money(i.monto)}</td><td><span className={s[1]}><Icon size={14}/>{s[0]}</span></td><td><a href={wa(i,c)} target="_blank"><MessageCircle size={16}/></a><a href={mail(i,c)}><Bell size={16}/></a><button onClick={()=>{setEditF(i.id);setFf({...i,clienteId:String(i.clienteId)})}}><Edit size={16}/></button><button onClick={()=>setData({...data,invoices:data.invoices.filter(x=>x.id!==i.id)})}><Trash2 size={16}/></button></td></tr>})}</tbody></table></div>}
