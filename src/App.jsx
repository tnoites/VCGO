import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "vcgo_daily_v3";

const empty = () => ({
  id: "",
  data: todayISO(),
  kms_inicio: "",
  kms_fim: "",
  total_diario: "",
  abastec_litros: "",
  abastec_euros: "",
  transfers: "",
  multibanco_euros: "",
  observacoes: "",
});

function pad2(n) { return String(n).padStart(2, "0"); }
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function uid() { return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function n(v) {
  if (v === "" || v === null || v === undefined) return "";
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const x = Number(s);
  return Number.isFinite(x) ? x : "";
}
function eur(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}
function fmt(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString("pt-PT");
}
function kmTotal(r) {
  const t = Number(r.total_diario);
  if (Number.isFinite(t) && t > 0) return t;
  const a = Number(r.kms_inicio), b = Number(r.kms_fim);
  if (Number.isFinite(a) && Number.isFinite(b) && b >= a) return b - a;
  return 0;
}

function loadRows() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [rows, setRows] = useState(() => loadRows());
  const [draft, setDraft] = useState(() => ({ ...empty() }));
  const [filters, setFilters] = useState({ q: "", from: "", to: "" });
  const [editing, setEditing] = useState(null); // row
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => String(b.data).localeCompare(String(a.data))),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return sorted.filter((r) => {
      if (filters.from && String(r.data) < String(filters.from)) return false;
      if (filters.to && String(r.data) > String(filters.to)) return false;
      if (!q) return true;
      const hay = `${r.data} ${r.observacoes || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sorted, filters]);

  const kpis = useMemo(() => {
    const sum = (k) => filtered.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
    return {
      dias: filtered.length,
      km: filtered.reduce((acc, r) => acc + kmTotal(r), 0),
      abastec_e: sum("abastec_euros"),
      abastec_l: sum("abastec_litros"),
      transfers: sum("transfers"),
      multibanco: sum("multibanco_euros"),
    };
  }, [filtered]);

  function upsert(input) {
    const row = {
      ...input,
      id: input.id || uid(),
      data: input.data || todayISO(),
      kms_inicio: n(input.kms_inicio),
      kms_fim: n(input.kms_fim),
      total_diario: n(input.total_diario),
      abastec_litros: n(input.abastec_litros),
      abastec_euros: n(input.abastec_euros),
      transfers: n(input.transfers),
      multibanco_euros: n(input.multibanco_euros),
      observacoes: String(input.observacoes || "").trim(),
    };

    setRows((prev) => {
      const exists = prev.some((x) => x.id === row.id);
      return exists ? prev.map((x) => (x.id === row.id ? row : x)) : [row, ...prev];
    });

    setDraft({ ...empty(), data: todayISO() });
  }

  function remove(id) {
    setRows((prev) => prev.filter((x) => x.id !== id));
    setConfirmDel(null);
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="h1">
            VCGO <span className="badge">Registo diário</span>
          </div>
          <div className="sub">
            DATA • KMS • ABASTECIMENTO • TRANSFERS • MULTIBANCO • OBSERVAÇÕES — com <b>Editar</b> e <b>Apagar</b>.
          </div>
        </div>
      </div>

      <div className="grid cols2">
        <div className="card">
          <div className="p">
            <h3>Novo registo</h3>

            <div className="row cols3">
              <div>
                <label>DATA</label>
                <input type="date" value={draft.data} onChange={(e) => setDraft(d => ({ ...d, data: e.target.value }))} />
              </div>
              <div>
                <label>KMS INÍCIO</label>
                <input value={draft.kms_inicio} onChange={(e) => setDraft(d => ({ ...d, kms_inicio: e.target.value }))} placeholder="ex.: 152340" />
              </div>
              <div>
                <label>KMS FIM</label>
                <input value={draft.kms_fim} onChange={(e) => setDraft(d => ({ ...d, kms_fim: e.target.value }))} placeholder="ex.: 152410" />
              </div>
            </div>

            <div className="row cols3" style={{ marginTop: 10 }}>
              <div>
                <label>TOTAL DIÁRIO</label>
                <input value={draft.total_diario} onChange={(e) => setDraft(d => ({ ...d, total_diario: e.target.value }))} placeholder="auto ou manual" />
                <small>Auto (fim − início): <b>{kmTotal(draft) ? fmt(kmTotal(draft)) : "—"}</b></small>
              </div>
              <div>
                <label>ABASTECIMENTO (LITROS)</label>
                <input value={draft.abastec_litros} onChange={(e) => setDraft(d => ({ ...d, abastec_litros: e.target.value }))} placeholder="ex.: 18" />
              </div>
              <div>
                <label>ABASTECIMENTO (EUROS)</label>
                <input value={draft.abastec_euros} onChange={(e) => setDraft(d => ({ ...d, abastec_euros: e.target.value }))} placeholder="ex.: 32,40" />
              </div>
            </div>

            <div className="row cols3" style={{ marginTop: 10 }}>
              <div>
                <label>TRANSFERS</label>
                <input value={draft.transfers} onChange={(e) => setDraft(d => ({ ...d, transfers: e.target.value }))} placeholder="ex.: 6" />
              </div>
              <div>
                <label>MULTIBANCO (EUROS)</label>
                <input value={draft.multibanco_euros} onChange={(e) => setDraft(d => ({ ...d, multibanco_euros: e.target.value }))} placeholder="ex.: 85,00" />
              </div>
              <div>
                <label>OBSERVAÇÕES</label>
                <input value={draft.observacoes} onChange={(e) => setDraft(d => ({ ...d, observacoes: e.target.value }))} placeholder="ex.: aeroporto / hotel / portagens…" />
              </div>
            </div>

            <hr />

            <div className="actions">
              <button className="primary" onClick={() => upsert(draft)}>Guardar</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p">
            <h3>Resumo (com filtros)</h3>

            <div className="kpis">
              <div className="kpi"><div className="t">Dias</div><div className="v">{fmt(kpis.dias)}</div></div>
              <div className="kpi"><div className="t">Km (TOTAL)</div><div className="v">{kpis.km ? `${fmt(kpis.km)} km` : "—"}</div></div>
              <div className="kpi"><div className="t">Abastecimento (€)</div><div className="v">{kpis.abastec_e ? eur(kpis.abastec_e) : "—"}</div></div>
              <div className="kpi"><div className="t">Abastecimento (L)</div><div className="v">{kpis.abastec_l ? `${fmt(kpis.abastec_l)} L` : "—"}</div></div>
              <div className="kpi"><div className="t">Transfers</div><div className="v">{kpis.transfers ? fmt(kpis.transfers) : "—"}</div></div>
              <div className="kpi"><div className="t">Multibanco (€)</div><div className="v">{kpis.multibanco ? eur(kpis.multibanco) : "—"}</div></div>
            </div>

            <hr />

            <h3 style={{ marginTop: 0 }}>Filtros</h3>
            <div className="row cols2">
              <div>
                <label>Pesquisar (observações)</label>
                <input value={filters.q} onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))} placeholder="ex.: aeroporto, hotel…" />
              </div>
              <div>
                <label>De</label>
                <input type="date" value={filters.from} onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))} />
              </div>
              <div>
                <label>Até</label>
                <input type="date" value={filters.to} onChange={(e) => setFilters(f => ({ ...f, to: e.target.value }))} />
              </div>
              <div className="actions" style={{ justifyContent: "flex-start", alignItems: "flex-end" }}>
                <button className="ghost" onClick={() => setFilters({ q: "", from: "", to: "" })}>Limpar</button>
              </div>
            </div>

            <small>Os dados ficam guardados neste aparelho (versão local).</small>
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>DATA</th>
              <th className="right">KMS INÍCIO</th>
              <th className="right">KMS FIM</th>
              <th className="right">TOTAL DIÁRIO</th>
              <th className="right">ABAST. (L)</th>
              <th className="right">ABAST. (€)</th>
              <th className="right">TRANSFERS</th>
              <th className="right">MULTIBANCO (€)</th>
              <th>OBSERVAÇÕES</th>
              <th className="right">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.data}</td>
                <td className="right">{r.kms_inicio !== "" ? fmt(r.kms_inicio) : "—"}</td>
                <td className="right">{r.kms_fim !== "" ? fmt(r.kms_fim) : "—"}</td>
                <td className="right">{r.total_diario !== "" ? fmt(r.total_diario) : (kmTotal(r) ? fmt(kmTotal(r)) : "—")}</td>
                <td className="right">{r.abastec_litros !== "" ? fmt(r.abastec_litros) : "—"}</td>
                <td className="right">{r.abastec_euros !== "" ? eur(r.abastec_euros) : "—"}</td>
                <td className="right">{r.transfers !== "" ? fmt(r.transfers) : "—"}</td>
                <td className="right">{r.multibanco_euros !== "" ? eur(r.multibanco_euros) : "—"}</td>
                <td title={r.observacoes || ""}>{r.observacoes || "—"}</td>
                <td className="right">
                  <div className="actions" style={{ justifyContent: "flex-end" }}>
                    <button onClick={() => setEditing(r)}>Editar</button>
                    <button className="danger" onClick={() => setConfirmDel(r)}>Apagar</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={10} style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>
                  Sem registos.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <Modal title={`Editar ${editing.data}`} onClose={() => setEditing(null)}>
          <EditForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSave={(next) => { upsert(next); setEditing(null); }}
          />
        </Modal>
      ) : null}

      {confirmDel ? (
        <Modal title="Confirmar apagamento" onClose={() => setConfirmDel(null)}>
          <div className="p">
            <p style={{ marginTop: 0, color: "rgba(255,255,255,.8)" }}>
              Apagar o registo de <b>{confirmDel.data}</b>? (não dá para desfazer)
            </p>
            <div className="actions">
              <button className="ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="danger" onClick={() => remove(confirmDel.id)}>Apagar</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modalBack" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="p">
          <div className="modalHeader">
            <div style={{ fontWeight: 800 }}>{title}</div>
            <button className="ghost" onClick={onClose}>Fechar</button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditForm({ initial, onCancel, onSave }) {
  const [x, setX] = useState(() => ({ ...initial }));

  return (
    <div className="p">
      <div className="row cols3">
        <div><label>DATA</label><input type="date" value={x.data} onChange={(e)=>setX(s=>({ ...s, data: e.target.value }))} /></div>
        <div><label>KMS INÍCIO</label><input value={x.kms_inicio} onChange={(e)=>setX(s=>({ ...s, kms_inicio: e.target.value }))} /></div>
        <div><label>KMS FIM</label><input value={x.kms_fim} onChange={(e)=>setX(s=>({ ...s, kms_fim: e.target.value }))} /></div>
      </div>

      <div className="row cols3" style={{ marginTop: 10 }}>
        <div><label>TOTAL DIÁRIO</label><input value={x.total_diario} onChange={(e)=>setX(s=>({ ...s, total_diario: e.target.value }))} /></div>
        <div><label>ABASTECIMENTO (LITROS)</label><input value={x.abastec_litros} onChange={(e)=>setX(s=>({ ...s, abastec_litros: e.target.value }))} /></div>
        <div><label>ABASTECIMENTO (EUROS)</label><input value={x.abastec_euros} onChange={(e)=>setX(s=>({ ...s, abastec_euros: e.target.value }))} /></div>
      </div>

      <div className="row cols3" style={{ marginTop: 10 }}>
        <div><label>TRANSFERS</label><input value={x.transfers} onChange={(e)=>setX(s=>({ ...s, transfers: e.target.value }))} /></div>
        <div><label>MULTIBANCO (EUROS)</label><input value={x.multibanco_euros} onChange={(e)=>setX(s=>({ ...s, multibanco_euros: e.target.value }))} /></div>
        <div><label>OBSERVAÇÕES</label><input value={x.observacoes} onChange={(e)=>setX(s=>({ ...s, observacoes: e.target.value }))} /></div>
      </div>

      <hr />

      <div className="actions">
        <button className="ghost" onClick={onCancel}>Cancelar</button>
        <button className="primary" onClick={()=>onSave(x)}>Guardar alterações</button>
      </div>
    </div>
  );
}
