import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "vcgo_driver_log_v1";

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function parseNumber(v) {
  if (v === "" || v === null || v === undefined) return "";
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : "";
}

function money(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return x.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function num(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return x.toLocaleString("pt-PT");
}

function computeKmTotal(kmStart, kmEnd, kmTotal) {
  const kt = Number(kmTotal);
  if (Number.isFinite(kt) && kt > 0) return kt;
  const ks = Number(kmStart);
  const ke = Number(kmEnd);
  if (Number.isFinite(ks) && Number.isFinite(ke) && ke >= ks) return ke - ks;
  return 0;
}

export default function App() {
  const [entries, setEntries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  const [form, setForm] = useState({
    date: todayISO(),
    revenue: "",
    trips: "",
    kmStart: "",
    kmEnd: "",
    kmTotal: "",
    notes: ""
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const km = computeKmTotal(form.kmStart, form.kmEnd, form.kmTotal);

  function add() {
    setEntries([{ id: uid(), ...form }, ...entries]);
    setForm({
      date: todayISO(),
      revenue: "",
      trips: "",
      kmStart: "",
      kmEnd: "",
      kmTotal: "",
      notes: ""
    });
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h2>VCGO – Registo diário</h2>

      <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/><br/><br/>

      <input placeholder="Faturação €" value={form.revenue} onChange={e=>setForm(f=>({...f,revenue:e.target.value}))}/><br/><br/>
      <input placeholder="Viagens" value={form.trips} onChange={e=>setForm(f=>({...f,trips:e.target.value}))}/><br/><br/>

      <input placeholder="Km início" value={form.kmStart} onChange={e=>setForm(f=>({...f,kmStart:e.target.value}))}/>
      <input placeholder="Km fim" value={form.kmEnd} onChange={e=>setForm(f=>({...f,kmEnd:e.target.value}))}/>
      <input placeholder="Km total" value={form.kmTotal} onChange={e=>setForm(f=>({...f,kmTotal:e.target.value}))}/>

      <p>Km do dia: {km || "—"}</p>

      <textarea placeholder="Notas" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>

      <br/><br/>
      <button onClick={add}>Guardar dia</button>

      <hr/>

      {entries.map(e=>(
        <div key={e.id}>
          <b>{e.date}</b> — {money(e.revenue)} — {num(e.trips)} viagens — {computeKmTotal(e.kmStart,e.kmEnd,e.kmTotal)} km
        </div>
      ))}
    </div>
  );
}
