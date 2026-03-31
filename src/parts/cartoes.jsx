// ─── CARTÕES ─────────────────────────────────────────────────────────────────

function Cartoes({ cartoes, setCartoes, transactions, setTransactions, bancos, setBancos }) {
  const [modalCartao, setModalCartao] = useState(false);
  const [modalCompra, setModalCompra] = useState(null);
  const [editandoCartao, setEditandoCartao] = useState(null);
  const [formCartao, setFormCartao] = useState({ nome:'', limite:'', dataFechamento:'', dataVencimento:'' });
  const [formCompra, setFormCompra] = useState({ categoria:'', valor:'', data:today(), obs:'', parcelas:'1' });
  const [extratoAberto, setExtratoAberto] = useState(null);
  const [extratoMes, setExtratoMes] = useState(mesAtual());
  const [vinculando, setVinculando] = useState(null);
  const mesesOpts = Array.from({ length: 6 }, (_, i) => getMes(i - 5));

  function abrirCartao(c) {
    setFormCartao(c ? { nome:c.nome, limite:String(c.limite), dataFechamento:String(c.dataFechamento), dataVencimento:String(c.dataVencimento) } : { nome:'', limite:'', dataFechamento:'', dataVencimento:'' });
    setEditandoCartao(c ? c.id : null);
    setModalCartao(true);
  }
  function salvarCartao() {
    if (!formCartao.nome || !formCartao.limite) return;
    const c = { id:editandoCartao||uid(), nome:formCartao.nome, limite:money(formCartao.limite), usado:editandoCartao?(cartoes.find(x=>x.id===editandoCartao)?.usado||0):0, dataFechamento:Number(formCartao.dataFechamento)||1, dataVencimento:Number(formCartao.dataVencimento)||10 };
    setCartoes(prev => editandoCartao ? prev.map(x => x.id===editandoCartao ? c : x) : [...prev, c]);
    setModalCartao(false);
  }
  function excluirCartao(id) {
    const temTx = transactions.some(t => t.cartaoId === id);
    if (temTx && !confirm('Cartão tem transações. Excluir mesmo assim?')) return;
    setCartoes(prev => prev.filter(c => c.id !== id));
    setBancos(prev => prev.map(b => ({ ...b, cartoesVinculados: (b.cartoesVinculados||[]).filter(cid => cid!==id) })));
  }
  function salvarCompra(cartaoId) {
    if (!formCompra.categoria || !formCompra.valor) return;
    const valorTotal = money(formCompra.valor);
    const parcelas = Math.max(1, parseInt(formCompra.parcelas)||1);
    const vParcela = money(valorTotal / parcelas);
    const nomeCartao = cartoes.find(c => c.id===cartaoId)?.nome || '';
    const novasTx = Array.from({ length: parcelas }, (_, i) => {
      const d = new Date(formCompra.data);
      d.setMonth(d.getMonth() + i);
      const dataStr = d.toISOString().split('T')[0];
      return {
        id: uid() + i, tipo:'Cartão de Crédito', categoria:formCompra.categoria,
        valor: i === parcelas-1 ? money(valorTotal - vParcela*(parcelas-1)) : vParcela,
        data:dataStr, pagamento:'Cartão '+nomeCartao,
        obs: parcelas>1 ? (i+1)+'/'+parcelas+(formCompra.obs?' - '+formCompra.obs:'') : formCompra.obs,
        mes:dataStr.slice(0,7), cartaoId, bancoId:null, contaId:null
      };
    });
    setTransactions(prev => [...prev, ...novasTx]);
    setCartoes(prev => prev.map(c => c.id===cartaoId ? {...c, usado:money(c.usado+valorTotal)} : c));
    setFormCompra({ categoria:'', valor:'', data:today(), obs:'', parcelas:'1' });
    setModalCompra(null);
  }
  function confirmarVinculacao() {
    if (!vinculando) return;
    const { cartaoId, bancoId } = vinculando;
    setBancos(prev => prev.map(b => {
      const v = Array.isArray(b.cartoesVinculados) ? b.cartoesVinculados : [];
      if (b.id === bancoId) return { ...b, cartoesVinculados: [...v.filter(id=>id!==cartaoId), cartaoId] };
      return { ...b, cartoesVinculados: v.filter(id=>id!==cartaoId) };
    }));
    setVinculando(null);
  }
  function getBancoDoCartao(cartaoId) {
    return bancos.find(b => (b.cartoesVinculados||[]).includes(cartaoId));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Cartões de Crédito</h1>
        <button onClick={() => abrirCartao(null)} className={btnP+' flex items-center gap-2'}><Plus size={16}/>Novo Cartão</button>
      </div>

      {cartoes.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm border border-gray-100">Nenhum cartão cadastrado</div>
      )}

      {cartoes.map(c => {
        const pct = c.limite > 0 ? Math.min((c.usado/c.limite)*100, 100) : 0;
        const bancoVinculado = getBancoDoCartao(c.id);
        const isExtrato = extratoAberto === c.id;
        const txExtrato = transactions.filter(t => t.cartaoId===c.id && t.mes===extratoMes).sort((a,b) => b.data.localeCompare(a.data));
        const totalExtrato = txExtrato.reduce((s,t) => s+t.valor, 0);

        return (
          <div key={c.id} className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 shadow-md text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-indigo-200 text-xs mb-1">Cartão de Crédito</p>
                <h3 className="text-xl font-bold">{c.nome}</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => abrirCartao(c)} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg"><Edit size={14}/></button>
                <button onClick={() => excluirCartao(c.id)} className="p-2 bg-white/20 hover:bg-red-400/50 rounded-lg"><Trash2 size={14}/></button>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-indigo-200">Usado: {fmt(c.usado)}</span>
                <span className="text-indigo-200">Limite: {fmt(c.limite)}</span>
              </div>
              <div className="bg-white/20 rounded-full h-2">
                <div className={'h-2 rounded-full '+(pct>=100?'bg-red-400':pct>=90?'bg-yellow-400':'bg-green-400')} style={{ width:pct+'%' }}/>
              </div>
              <p className="text-xs text-indigo-200 mt-1">{fmt(c.limite-c.usado)} disponível · Fecha dia {c.dataFechamento} · Vence dia {c.dataVencimento}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => { setFormCompra({ categoria:'', valor:'', data:today(), obs:'', parcelas:'1' }); setModalCompra(c.id); }}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                <Plus size={13}/>Lançar Compra
              </button>
              <button onClick={() => setExtratoAberto(isExtrato ? null : c.id)}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                <FileText size={13}/>{isExtrato ? 'Fechar' : 'Ver Extrato'}
              </button>
              <select
                value={bancoVinculado?.id||''}
                onChange={e => {
                  const bid = Number(e.target.value)||null;
                  if (bid) setVinculando({ cartaoId:c.id, bancoId:bid });
                  else setBancos(prev => prev.map(b => ({ ...b, cartoesVinculados:(b.cartoesVinculados||[]).filter(id=>id!==c.id) })));
                }}
                className="bg-white/20 text-white text-xs px-2 py-1.5 rounded-lg border-0 focus:outline-none">
                <option value="" style={{ color:'#1f2937' }}>Sem banco vinculado</option>
                {bancos.map(b => <option key={b.id} value={b.id} style={{ color:'#1f2937' }}>{b.nome}</option>)}
              </select>
            </div>

            {isExtrato && (
              <div className="mt-4 bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm">Extrato</p>
                  <select value={extratoMes} onChange={e => setExtratoMes(e.target.value)} className="bg-white/20 text-white text-xs px-2 py-1 rounded-lg border-0 focus:outline-none">
                    {mesesOpts.map(m => <option key={m} value={m} style={{ color:'#1f2937' }}>{getMesLabel(m)}</option>)}
                  </select>
                </div>
                {txExtrato.length === 0 ? (
                  <p className="text-xs text-indigo-200 text-center py-2">Nenhuma compra em {getMesLabel(extratoMes)}</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {txExtrato.map(t => (
                        <div key={t.id} className="flex justify-between text-xs">
                          <span className="text-indigo-100">{t.data.split('-').reverse().join('/')} · {t.categoria}{t.obs?' ('+t.obs+')':''}</span>
                          <span className="font-medium">{fmt(t.valor)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-semibold text-sm mt-2 pt-2 border-t border-white/20">
                      <span>Total</span><span>{fmt(totalExtrato)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {modalCartao && (
        <Modal titulo={editandoCartao ? 'Editar Cartão' : 'Novo Cartão'} onClose={() => setModalCartao(false)}>
          <Campo label="Nome"><input type="text" value={formCartao.nome} onChange={e => setFormCartao({...formCartao,nome:e.target.value})} className={inp} placeholder="Ex: Nubank, Itaú..."/></Campo>
          <Campo label="Limite (R$)"><input type="number" step="0.01" min="0" value={formCartao.limite} onChange={e => setFormCartao({...formCartao,limite:e.target.value})} className={inp} placeholder="0,00"/></Campo>
          <Campo label="Dia de Fechamento"><input type="number" min="1" max="31" value={formCartao.dataFechamento} onChange={e => setFormCartao({...formCartao,dataFechamento:e.target.value})} className={inp} placeholder="Ex: 25"/></Campo>
          <Campo label="Dia de Vencimento"><input type="number" min="1" max="31" value={formCartao.dataVencimento} onChange={e => setFormCartao({...formCartao,dataVencimento:e.target.value})} className={inp} placeholder="Ex: 5"/></Campo>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalCartao(false)} className={btnS+' flex-1'}>Cancelar</button>
            <button onClick={salvarCartao} className={btnP+' flex-1'}>Salvar</button>
          </div>
        </Modal>
      )}

      {modalCompra && (
        <Modal titulo={'Lançar Compra — '+(cartoes.find(c=>c.id===modalCompra)?.nome||'')} onClose={() => setModalCompra(null)}>
          <Campo label="Categoria">
            <select value={formCompra.categoria} onChange={e => setFormCompra({...formCompra,categoria:e.target.value})} className={inp}>
              <option value="">Selecione...</option>
              {CATEGORIAS['Cartão de Crédito'].map(c => <option key={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo label="Valor Total (R$)"><input type="number" step="0.01" min="0" value={formCompra.valor} onChange={e => setFormCompra({...formCompra,valor:e.target.value})} className={inp} placeholder="0,00"/></Campo>
          <Campo label="Data"><input type="date" value={formCompra.data} onChange={e => setFormCompra({...formCompra,data:e.target.value})} className={inp}/></Campo>
          <Campo label="Parcelas">
            <select value={formCompra.parcelas} onChange={e => setFormCompra({...formCompra,parcelas:e.target.value})} className={inp}>
              {Array.from({ length: 12 }, (_, i) => i+1).map(n => (
                <option key={n} value={n}>{n}x{formCompra.valor ? ' de '+fmt(money(formCompra.valor)/n) : ''}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Observações"><input type="text" value={formCompra.obs} onChange={e => setFormCompra({...formCompra,obs:e.target.value})} className={inp} placeholder="Opcional"/></Campo>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalCompra(null)} className={btnS+' flex-1'}>Cancelar</button>
            <button onClick={() => salvarCompra(modalCompra)} className={btnP+' flex-1'}>Lançar</button>
          </div>
        </Modal>
      )}

      {vinculando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-800 mb-2">Confirmar vinculação</h3>
            <p className="text-gray-600 text-sm mb-4">
              Vincular <strong>{cartoes.find(c=>c.id===vinculando.cartaoId)?.nome}</strong> ao banco <strong>{bancos.find(b=>b.id===vinculando.bancoId)?.nome}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setVinculando(null)} className={btnS+' flex-1'}>Cancelar</button>
              <button onClick={confirmarVinculacao} className={btnP+' flex-1'}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
