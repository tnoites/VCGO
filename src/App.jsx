import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "motorista_paulo_carvalho_v2";

// ===== helpers =====
function pad2(n) {
  return String(n).padStart(2, "0");
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

/**
 * Robust number parsing:
 * - accepts: "10", "10,5", "10,50", "10€", "10 €", "1.234,56", "1,234.56"
 * - returns Number or "" (empty)
 */
function parseNumberLoose(v) {
  if (v === "" || v === null || v === undefined) return "";
  let s = String(v).trim();

  // keep only digits, comma, dot, minus
  s = s.replace(/[^\d,.\-]/g, "");

  // handle thousands separators in pt-PT style:
  // if contains both "." and "," assume "." thousands and "," decimal -> remove "." and change "," to "."
  if (s.includes(",") && s.includes(".")) {
    // choose rule: remove all dots, treat comma as decimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // only comma -> decimal
    s = s.replace(",", ".");
  }

  const x = Number(s);
  return Number.isFinite(x) ? x : "";
}

function stripEuroSuffix(v) {
  return String(v ?? "").replace(/\s*€\s*$/g, "");
}

function formatEuroNumber(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatEuroForInput(v) {
  const x = parseNumberLoose(v);
  if (x === "" || x === null || x === undefined) return "";
  return `${formatEuroNumber(x)} €`;
}

function eurDisplay(v) {
  const x = parseNumberLoose(v);
  if (x === "" || x === null || x === undefined) return "—";
  return `${formatEuroNumber(x)} €`;
}

function fmtDisplay(v) {
  const x = parseNumberLoose(v);
  if (x === "" || x === null || x === undefined) return "—";
  // for non-euro numeric display (kms, liters, transfers)
  return Number(x).toLocaleString("pt-PT");
}

// ===== storage =====
function empty() {
  return {
    id: "",
    data: todayISO(),
    kms_inicio: "",
    kms_fim: "",
    total_diario: "", // € (manual)
    abastec_litros: "", // liters
    abastec_euros: "", // € (manual)
    transfers: "", // count (manual)
    multibanco_euros: "", // € (manual)
    observacoes: "",
  };
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
  const [draft, setDraft] = useState(() => empty());
  const [filters, setFilters] = useState({ q: "", from: "", to: "" });

  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => String(b.data).localeCompare(String(a.data)));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return sorted.filter((r) => {
      if (filters.from && String(r.data) < String(filters.from)) return false;
      if (filters.to && String(r.data) > String(r.data) && false) return false; // no-op safeguard
      if (filters.to && String(r.data) > String(filters.to)) return false;
      if (!q) return true;
      const hay = `${r.data} ${r.observacoes || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sorted, filters]);

  function upsert(input) {
    // ✅ NO AUTO-CALC: just store what user typed, but normalize numeric types
    const row = {
      ...input,
      id: input.id || uid(),
      data: input.data || todayISO(),

      // numbers: store as number OR "" (empty)
      kms_inicio: parseNumberLoose(input.kms_inicio),
      kms_fim: parseNumberLoose(input.kms_fim),

      total_diario: parseNumberLoose(input.total_diario), // € numeric
      abastec_litros: parseNumberLoose(input.abastec_litros), // liters numeric
      abastec_euros: parseNumberLoose(input.abastec_euros), // € numeric
      transfers: parseNumberLoose(input.transfers), // count numeric
      multibanco_euros: parseNumberLoose(input.multibanco_euros), // € numeric

      observacoes: String(input.observacoes || "").trim(),
    };

    setRows((prev) => {
      const exists = prev.some((x) => x.id === row.id);
      return exists ? prev.map((x) => (x.id === row.id ? row : x)) : [row, ...prev];
    });

    setDraft(empty());
  }

  function remove(id) {
    setRows((prev) => prev.filter((x) => x.id !== id));
    setConfirmDel(null);
  }

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{ height: 42, width: "auto", display: "block" }}
          />
          <div>
            <div className="h1">Motorista Paulo Carvalho</div>
            <div className="sub">Registo diário — tudo manual, tudo fica guardado.</div>
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
                <input
                  type="date"
                  value={draft.data}
                  onChange={(e) => setDraft((d) => ({ ...d, data: e.target.value }))}
                />
              </div>

              <div>
                <label>KMS INÍCIO</label>
                <input
                  inputMode="numeric"
                  value={draft.kms_inicio}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, kms_inicio: e.target.value }))
                  }
                  placeholder="ex.: 152340"
                />
              </div>

              <div>
                <label>KMS FIM</label>
                <input
                  inputMode="numeric"
                  value={draft.kms_fim}
                  onChange={(e) => setDraft((d) => ({ ...d, kms_fim: e.target.value }))}
                  placeholder="ex.: 152410"
                />
              </div>
            </div>

            <div className="row cols3" style={{ marginTop: 10 }}>
              <div>
                <label>TOTAL DIÁRIO (EUROS)</label>
                <input
                  inputMode="decimal"
                  value={draft.total_diario}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, total_diario: stripEuroSuffix(e.target.value) }))
                  }
                  onBlur={() =>
                    setDraft((d) => ({ ...d, total_diario: formatEuroForInput(d.total_diario) }))
                  }
                  placeholder="ex.: 120,50"
                />
                <small>Formato automático em € ao sair do campo.</small>
              </div>

              <div>
                <label>ABASTECIMENTO (LITROS)</label>
                <input
                  inputMode="decimal"
                  value={draft.abastec_litros}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, abastec_litros: e.target.value }))
                  }
                  placeholder="ex.: 18"
                />
              </div>

              <div>
                <label>ABASTECIMENTO (EUROS)</label>
                <input
                  inputMode="decimal"
                  value={draft.abastec_euros}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, abastec_euros: stripEuroSuffix(e.target.value) }))
                  }
                  onBlur={() =>
                    setDraft((d) => ({ ...d, abastec_euros: formatEuroForInput(d.abastec_euros) }))
                  }
                  placeholder="ex.: 32,40"
                />
              </div>
            </div>

            <div className="row cols3" style={{ marginTop: 10 }}>
              <div>
                <label>TRANSFERS</label>
                <input
                  inputMode="numeric"
                  value={draft.transfers}
                  onChange={(e) => setDraft((d) => ({ ...d, transfers: e.target.value }))}
                  placeholder="ex.: 6"
                />
              </div>

              <div>
                <label>MULTIBANCO (EUROS)</label>
                <input
                  inputMode="decimal"
                  value={draft.multibanco_euros}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      multibanco_euros: stripEuroSuffix(e.target.value),
                    }))
                  }
                  onBlur={() =>
                    setDraft((d) => ({
                      ...d,
                      multibanco_euros: formatEuroForInput(d.multibanco_euros),
                    }))
                  }
                  placeholder="ex.: 85,00"
                />
              </div>

              <div>
                <label>OBSERVAÇÕES</label>
                <input
                  value={draft.observacoes}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, observacoes: e.target.value }))
                  }
                  placeholder="ex.: aeroporto / hotel / portagens…"
                />
              </div>
            </div>

            <hr />

            <div className="actions">
              <button className="primary" onClick={() => upsert(draft)}>
                Guardar
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p">
            <h3>Filtros</h3>

            <div className="row cols2">
              <div>
                <label>Pesquisar (observações)</label>
                <input
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                  placeholder="ex.: aeroporto, hotel…"
                />
              </div>

              <div>
                <label>De</label>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                />
              </div>

              <div>
                <label>Até</label>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                />
              </div>

              <div className="actions" style={{ justifyContent: "flex-start", alignItems: "flex-end" }}>
                <button className="ghost" onClick={() => setFilters({ q: "", from: "", to: "" })}>
                  Limpar
                </button>
              </div>
            </div>

            <small>Não há somas automáticas. A app só guarda e lista os registos.</small>
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
                <td className="right">{r.kms_inicio !== "" ? fmtDisplay(r.kms_inicio) : "—"}</td>
                <td className="right">{r.kms_fim !== "" ? fmtDisplay(r.kms_fim) : "—"}</td>

                <td className="right">{r.total_diario !== "" ? eurDisplay(r.total_diario) : "—"}</td>

                <td className="right">{r.abastec_litros !== "" ? fmtDisplay(r.abastec_litros) : "—"}</td>
                <td className="right">{r.abastec_euros !== "" ? eurDisplay(r.abastec_euros) : "—"}</td>

                <td className="right">{r.transfers !== "" ? fmtDisplay(r.transfers) : "—"}</td>
                <td className="right">{r.multibanco_euros !== "" ? eurDisplay(r.multibanco_euros) : "—"}</td>

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
            onSave={(next) => {
              upsert(next);
              setEditing(null);
            }}
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
              <button className="ghost" onClick={() => setConfirmDel(null)}>
                Cancelar
              </button>
              <button className="danger" onClick={() => remove(confirmDel.id)}>
                Apagar
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

// ===== modal + edit form =====
function Modal({ title, onClose, children }) {
  return (
    <div className="modalBack" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="p">
          <div className="modalHeader">
            <div style={{ fontWeight: 800 }}>{title}</div>
            <button className="ghost" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditForm({ initial, onCancel, onSave }) {
  const [x, setX] = useState(() => ({
    ...initial,

    // show euros formatted in the edit form too
    total_diario: initial.total_diario !== "" ? formatEuroForInput(initial.total_diario) : "",
    abastec_euros: initial.abastec_euros !== "" ? formatEuroForInput(initial.abastec_euros) : "",
    multibanco_euros: initial.multibanco_euros !== "" ? formatEuroForInput(initial.multibanco_euros) : "",
  }));

  return (
    <div className="p">
      <div className="row cols3">
        <div>
          <label>DATA</label>
          <input
            type="date"
            value={x.data}
            onChange={(e) => setX((s) => ({ ...s, data: e.target.value }))}
          />
        </div>

        <div>
          <label>KMS INÍCIO</label>
          <input
            value={x.kms_inicio}
            onChange={(e) => setX((s) => ({ ...s, kms_inicio: e.target.value }))}
          />
        </div>

        <div>
          <label>KMS FIM</label>
          <input
            value={x.kms_fim}
            onChange={(e) => setX((s) => ({ ...s, kms_fim: e.target.value }))}
          />
        </div>
      </div>

      <div className="row cols3" style={{ marginTop: 10 }}>
        <div>
          <label>TOTAL DIÁRIO (EUROS)</label>
          <input
            value={x.total_diario}
            onChange={(e) =>
              setX((s) => ({ ...s, total_diario: stripEuroSuffix(e.target.value) }))
            }
            onBlur={() =>
              setX((s) => ({ ...s, total_diario: formatEuroForInput(s.total_diario) }))
            }
          />
        </div>

        <div>
          <label>ABASTECIMENTO (LITROS)</label>
          <input
            value={x.abastec_litros}
            onChange={(e) => setX((s) => ({ ...s, abastec_litros: e.target.value }))}
          />
        </div>

        <div>
          <label>ABASTECIMENTO (EUROS)</label>
          <input
            value={x.abastec_euros}
            onChange={(e) =>
              setX((s) => ({ ...s, abastec_euros: stripEuroSuffix(e.target.value) }))
            }
            onBlur={() =>
              setX((s) => ({ ...s, abastec_euros: formatEuroForInput(s.abastec_euros) }))
            }
          />
        </div>
      </div>

      <div className="row cols3" style={{ marginTop: 10 }}>
        <div>
          <label>TRANSFERS</label>
          <input
            value={x.transfers}
            onChange={(e) => setX((s) => ({ ...s, transfers: e.target.value }))}
          />
        </div>

        <div>
          <label>MULTIBANCO (EUROS)</label>
          <input
            value={x.multibanco_euros}
            onChange={(e) =>
              setX((s) => ({ ...s, multibanco_euros: stripEuroSuffix(e.target.value) }))
            }
            onBlur={() =>
              setX((s) => ({ ...s, multibanco_euros: formatEuroForInput(s.multibanco_euros) }))
            }
          />
        </div>

        <div>
          <label>OBSERVAÇÕES</label>
          <input
            value={x.observacoes}
            onChange={(e) => setX((s) => ({ ...s, observacoes: e.target.value }))}
          />
        </div>
      </div>

      <hr />

      <div className="actions">
        <button className="ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary" onClick={() => onSave(x)}>
          Guardar alterações
        </button>
      </div>
    </div>
  );
}
