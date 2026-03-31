// ─── DESPESAS ────────────────────────────────────────────────────────────────

function Despesas({ transactions, setTransactions, cartoes, setCartoes, getContasFlat }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtroMes, setFiltroMes] = useState(mesAtual());
  const [filtroTipo, setFiltroTipo] = useState('');
  const [form, setForm] = useState({ tipo:'Despesa Variável', categoria:'', valor:'', data:today(), pagamento:'', obs:'', contaId:null, cartaoId:null });
  const contas = getContasFlat();
  const mesesOpts = Array.from({ length: 12 }, (_, i) => getMes(i - 6));
  const tiposDespesa = ['Despesa Fixa','Despesa Variável','Cartão de Crédito','Investimentos'];

  let lista = transactions.filter(t => t.tipo !== 'Receita' && t.mes === filtroMes).sort((a,b) => b.data.localeCompare(a.data));
  if (filtroTipo) lista = lista.filter(t => t.tipo === filtroTipo);
  const total = lista.reduce((s, t) => s + t.valor, 0);

  function abrir(tx) {
    setForm(tx
      ? { tipo:tx.tipo, categoria:tx.categoria, valor:String(tx.valor), data:tx.data, pagamento:tx.pagamento||'', obs:tx.obs||'', contaId:tx.contaId||null, cartaoId:tx.cartaoId||null }
      : { tipo:'Despesa Variável', categoria:'', valor:'', data:today(), pagamento:'', obs:'', contaId:null, cartaoId:null });
    setEditando(tx ? tx.id : null);
    setModal(true);
  }
  function salvar() {
    if (!form.categoria || !form.valor || !form.data || !form.pagamento) return;
    const conta = contas.find(c => c.id === form.contaId);
    const tx = {
      id: editando||uid(), tipo:form.tipo, categoria:form.categoria, valor:money(form.valor),
      data:form.data, pagamento:form.pagamento, obs:form.obs, mes:form.data.slice(0,7),
      bancoId:conta?.bancoId||null, contaId:form.contaId||null,
      cartaoId:form.tipo==='Cartão de Crédito'?form.cartaoId:null
    };
    if (form.tipo === 'Cartão de Crédito' && form.cartaoId) {
      setCartoes(prev => prev.map(c => {
        if (c.id !== form.cartaoId) return c;
        const antigo = editando ? (transactions.find(t => t.id===editando)?.valor||0) : 0;
        return { ...c, usado: money(c.usado - antigo + tx.valor) };
      }));
    }
    setTransactions(prev => editando ? prev.map(t => t.id===editando ? tx : t) : [...prev, tx]);
    setModal(false);
  }
  function excluir(id) {
    if (!confirm('Excluir despesa?')) return;
    const tx = transactions.find(t => t.id===id);
    if (tx?.tipo==='Cartão de Crédito' && tx.cartaoId)
      setCartoes(prev => prev.map(c => c.id===tx.cartaoId ? {...c, usado:money(c.usado-tx.valor)} : c));
    setTransactions(prev => prev.filter(t => t.id!==id));
  }
  const corTipo = t => t==='Despesa Fixa' ? 'text-orange-600 bg-orange-50'
    : t==='Despesa Variável' ? 'text-red-600 bg-red-50'
    : t==='Cartão de Crédito' ? 'text-blue-600 bg-blue-50'
    : t==='Investimentos' ? 'text-purple-600 bg-purple-50'
    : 'text-gray-600 bg-gray-100';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Despesas</h1>
          <p className="text-gray-500 text-sm">Total: <span className="font-semibold text-red-600">{fmt(total)}</span></p>
        </div>
        <button onClick={() => abrir(null)} className={btnP+' flex items-center gap-2'}><Plus size={16}/>Nova Despesa</button>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={16} className="text-gray-400"/>
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={inp+' w-auto'}>
          {mesesOpts.map(m => <option key={m} value={m}>{getMesLabel(m)}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={inp+' w-auto'}>
          <option value="">Todos os tipos</option>
          {tiposDespesa.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-3">
        {lista.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm border border-gray-100">
            Nenhuma despesa no período
          </div>
        )}
        {lista.map(tx => {
          const conta = contas.find(c => c.id === tx.contaId);
          const cartao = cartoes.find(c => c.id === tx.cartaoId);
          return (
            <div key={tx.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={'p-2.5 rounded-xl '+corTipo(tx.tipo)}><ArrowDownCircle size={18}/></div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">{tx.categoria}</p>
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium '+corTipo(tx.tipo)}>{tx.tipo}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {tx.data.split('-').reverse().join('/')}
                    {tx.pagamento && ' · '+tx.pagamento}
                    {cartao && ' · '+cartao.nome}
                    {conta && ' · '+conta.bancoNome+' - '+conta.nome}
                    {tx.obs && ' · '+tx.obs}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-red-600">{fmt(tx.valor)}</span>
                <button onClick={() => abrir(tx)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit size={15}/></button>
                <button onClick={() => excluir(tx.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={15}/></button>
              </div>
            </div>
          );
        })}
      </div>
      {modal && (
        <Modal titulo="💸 Nova Despesa" onClose={() => setModal(false)}>
          <Campo label="Tipo">
            <select value={form.tipo} onChange={e => setForm({...form,tipo:e.target.value,categoria:''})} className={inp}>
              {tiposDespesa.map(t => <option key={t}>{t}</option>)}
            </select>
          </Campo>
          <Campo label="Categoria">
            <select value={form.categoria} onChange={e => setForm({...form,categoria:e.target.value})} className={inp}>
              <option value="">Selecione...</option>
              {(CATEGORIAS[form.tipo]||[]).map(c => <option key={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo label="Valor (R$)">
            <input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm({...form,valor:e.target.value})} className={inp} placeholder="0,00"/>
          </Campo>
          <Campo label="Data">
            <input type="date" value={form.data} onChange={e => setForm({...form,data:e.target.value})} className={inp}/>
          </Campo>
          <Campo label="Forma de Pagamento *">
            <select value={form.pagamento} onChange={e => setForm({...form,pagamento:e.target.value})} className={inp}>
              <option value="">Selecione...</option>
              {FORMAS_PAGAMENTO.map(f => <option key={f}>{f}</option>)}
              {cartoes.map(c => <option key={'c'+c.id} value={'Cartão '+c.nome}>Cartão {c.nome}</option>)}
            </select>
          </Campo>
          {form.tipo === 'Cartão de Crédito' && (
            <Campo label="Cartão">
              <select value={form.cartaoId||''} onChange={e => setForm({...form,cartaoId:Number(e.target.value)||null})} className={inp}>
                <option value="">Selecione...</option>
                {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome} (disp: {fmt(c.limite-c.usado)})</option>)}
              </select>
            </Campo>
          )}
          <Campo label="Conta Bancária">
            <select value={form.contaId||''} onChange={e => setForm({...form,contaId:Number(e.target.value)||null})} className={inp}>
              <option value="">Nenhuma</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.bancoNome} – {c.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Observações">
            <input type="text" value={form.obs} onChange={e => setForm({...form,obs:e.target.value})} className={inp} placeholder="Opcional"/>
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
