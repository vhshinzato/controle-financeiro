// ─── PLANEJAMENTO ─────────────────────────────────────────────────────────────

function Planejamento({ despesasFuturas, setDespesasFuturas, transactions }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [form, setForm] = useState({ categoria:'', valor:'', tipo:'Despesa Fixa', mes:mesAtual() });
  const proximos6 = Array.from({ length: 6 }, (_, i) => getMes(i));
  const mesHoje = mesAtual();

  function abrir(df) {
    setForm(df ? { categoria:df.categoria, valor:String(df.valor), tipo:df.tipo, mes:df.mes } : { categoria:'', valor:'', tipo:'Despesa Fixa', mes:mesAtual() });
    setEditando(df ? df.id : null);
    setModal(true);
  }
  function salvar() {
    if (!form.categoria || !form.valor) return;
    const df = { id:editando||uid(), categoria:form.categoria, valor:money(form.valor), tipo:form.tipo, mes:form.mes };
    setDespesasFuturas(prev => editando ? prev.map(d => d.id===editando ? df : d) : [...prev, df]);
    setModal(false);
  }
  function excluir(id) { if (confirm('Excluir?')) setDespesasFuturas(prev => prev.filter(d => d.id!==id)); }

  function getTotalMes(mes) {
    if (mes <= mesHoje) {
      return transactions.filter(t => t.tipo !== 'Receita' && t.mes === mes).reduce((s, t) => s + t.valor, 0);
    }
    return despesasFuturas.filter(df => df.mes <= mes).reduce((s, df) => s + df.valor, 0);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Planejamento</h1>
          <p className="text-gray-500 text-sm">Visão dos próximos 6 meses</p>
        </div>
        <button onClick={() => abrir(null)} className={btnP+' flex items-center gap-2'}><Plus size={16}/>Nova Recorrente</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {proximos6.map(mes => {
          const total = getTotalMes(mes);
          const isAtual = mes === mesHoje;
          const isPast = mes < mesHoje;
          return (
            <div key={mes}
              className={'bg-white rounded-2xl p-5 shadow-sm border cursor-pointer transition-all '+(isAtual ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-gray-100 hover:border-gray-200')}
              onClick={() => setExpandido(expandido===mes ? null : mes)}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700">{getMesLabel(mes)}</span>
                <div className="flex items-center gap-2">
                  {isAtual && <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">Atual</span>}
                  {isPast && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Passado</span>}
                  {expandido === mes ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                </div>
              </div>
              <p className={'text-xl font-bold '+(total > 0 ? 'text-red-600' : 'text-gray-400')}>{fmt(total)}</p>
              {expandido === mes && (
                <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3">
                  {(isPast || isAtual
                    ? transactions.filter(t => t.tipo !== 'Receita' && t.mes === mes)
                    : despesasFuturas.filter(df => df.mes <= mes)
                  ).map((item, i) => (
                    <div key={item.id||i} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.categoria}</span>
                      <span className="font-medium text-red-600">{fmt(item.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {despesasFuturas.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Despesas Recorrentes</h3>
          <div className="flex flex-col gap-2">
            {despesasFuturas.map(df => (
              <div key={df.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-700 text-sm">{df.categoria}</p>
                  <p className="text-xs text-gray-400">{df.tipo} · a partir de {getMesLabel(df.mes)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-600 text-sm">{fmt(df.valor)}/mês</span>
                  <button onClick={() => abrir(df)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit size={14}/></button>
                  <button onClick={() => excluir(df.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <Modal titulo="📅 Despesa Recorrente" onClose={() => setModal(false)}>
          <Campo label="Categoria / Nome">
            <input type="text" value={form.categoria} onChange={e => setForm({...form,categoria:e.target.value})} className={inp} placeholder="Ex: Aluguel, Academia..."/>
          </Campo>
          <Campo label="Valor Mensal (R$)">
            <input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm({...form,valor:e.target.value})} className={inp} placeholder="0,00"/>
          </Campo>
          <Campo label="Tipo">
            <select value={form.tipo} onChange={e => setForm({...form,tipo:e.target.value})} className={inp}>
              <option>Despesa Fixa</option>
              <option>Despesa Variável</option>
            </select>
          </Campo>
          <Campo label="A partir de">
            <select value={form.mes} onChange={e => setForm({...form,mes:e.target.value})} className={inp}>
              {proximos6.map(m => <option key={m} value={m}>{getMesLabel(m)}</option>)}
            </select>
          </Campo>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className={btnS+' flex-1'}>Cancelar</button>
            <button onClick={salvar} className={btnP+' flex-1'}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
