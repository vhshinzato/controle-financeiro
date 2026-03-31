// ─── BANCOS ──────────────────────────────────────────────────────────────────

function Bancos({ bancos, setBancos, transactions }) {
  const [modalBanco, setModalBanco] = useState(false);
  const [modalConta, setModalConta] = useState(null);
  const [formBanco, setFormBanco] = useState({ nome:'', cor:'#6366f1' });
  const [formConta, setFormConta] = useState({ tipo:'Corrente', nome:'', saldoInicial:'' });
  const [extratoAberto, setExtratoAberto] = useState(null);
  const [filtro, setFiltro] = useState({ mes:'', ano:'' });

  function adicionarBanco() {
    if (!formBanco.nome) return;
    setBancos(prev => [...prev, { id:uid(), nome:formBanco.nome, cor:formBanco.cor, contas:[], cartoesVinculados:[] }]);
    setFormBanco({ nome:'', cor:'#6366f1' });
    setModalBanco(false);
  }
  function excluirBanco(id) {
    if (!confirm('Excluir banco e todas as contas?')) return;
    setBancos(prev => prev.filter(b => b.id!==id));
  }
  function adicionarConta(bancoId) {
    if (formConta.saldoInicial === '') return;
    const conta = {
      id:uid(), tipo:formConta.tipo,
      nome:formConta.tipo==='Personalizada' ? formConta.nome : formConta.tipo,
      saldoInicial:money(formConta.saldoInicial), criadaEm:today()
    };
    setBancos(prev => prev.map(b => b.id===bancoId ? { ...b, contas:[...(b.contas||[]), conta] } : b));
    setFormConta({ tipo:'Corrente', nome:'', saldoInicial:'' });
    setModalConta(null);
  }
  function excluirConta(bancoId, contaId) {
    if (!confirm('Excluir conta?')) return;
    setBancos(prev => prev.map(b => b.id===bancoId ? { ...b, contas:b.contas.filter(c=>c.id!==contaId) } : b));
  }
  function getSaldo(conta) {
    const tx = transactions.filter(t => t.contaId === conta.id);
    const in_ = tx.filter(t=>t.tipo==='Receita').reduce((s,t)=>s+t.valor,0);
    const out = tx.filter(t=>t.tipo!=='Receita').reduce((s,t)=>s+t.valor,0);
    return money(conta.saldoInicial + in_ - out);
  }
  function getTxFiltradas(contaId) {
    let tx = transactions.filter(t => t.contaId === contaId);
    if (filtro.mes) tx = tx.filter(t => t.mes?.slice(5,7) === filtro.mes);
    if (filtro.ano) tx = tx.filter(t => t.mes?.slice(0,4) === filtro.ano);
    return tx.sort((a,b) => b.data.localeCompare(a.data));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Bancos e Contas</h1>
        <button onClick={() => setModalBanco(true)} className={btnP+' flex items-center gap-2'}><Plus size={16}/>Novo Banco</button>
      </div>

      {bancos.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm border border-gray-100">Nenhum banco cadastrado</div>
      )}

      {bancos.map(b => {
        const totalBanco = (b.contas||[]).reduce((s,c) => s+getSaldo(c), 0);
        return (
          <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5" style={{ borderLeft:'4px solid '+b.cor }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor:b.cor+'20' }}>
                  <Building2 size={20} style={{ color:b.cor }}/>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{b.nome}</h3>
                  <p className="text-sm text-gray-500">
                    {(b.contas||[]).length} conta(s) · Saldo total: <span className={totalBanco>=0?'font-semibold text-green-600':'font-semibold text-red-600'}>{fmt(totalBanco)}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setFormConta({ tipo:'Corrente', nome:'', saldoInicial:'' }); setModalConta(b.id); }}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 text-xs flex items-center gap-1">
                  <Plus size={14}/>Conta
                </button>
                <button onClick={() => excluirBanco(b.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={15}/></button>
              </div>
            </div>

            {(b.contas||[]).map(c => {
              const saldo = getSaldo(c);
              const isExtrato = extratoAberto === c.id;
              const txF = getTxFiltradas(c.id);
              const entradas = txF.filter(t=>t.tipo==='Receita').reduce((s,t)=>s+t.valor,0);
              const saidas = txF.filter(t=>t.tipo!=='Receita').reduce((s,t)=>s+t.valor,0);
              const tipoInfo = TIPOS_CONTA.find(t=>t.tipo===c.tipo) || TIPOS_CONTA[5];

              return (
                <div key={c.id} className="border-t border-gray-50">
                  <div className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{tipoInfo.label.split(' ')[0]}</span>
                      <div>
                        <p className="font-medium text-gray-700 text-sm">{c.nome}</p>
                        <p className="text-xs text-gray-400">Saldo inicial: {fmt(c.saldoInicial)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={'font-bold text-sm '+(saldo>=0?'text-green-600':'text-red-600')}>{fmt(saldo)}</span>
                      <button onClick={() => { setExtratoAberto(isExtrato?null:c.id); setFiltro({mes:'',ano:''}); }} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                        <FileText size={13}/>{isExtrato?'Fechar':'Extrato'}
                      </button>
                      <button onClick={() => excluirConta(b.id, c.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={13}/></button>
                    </div>
                  </div>

                  {isExtrato && (
                    <div className="mx-5 mb-4 bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <p className="font-semibold text-sm text-gray-700">Extrato</p>
                        <select value={filtro.mes} onChange={e => setFiltro(f=>({...f,mes:e.target.value}))} className={inp+' !py-1.5 w-auto text-xs'}>
                          <option value="">Todos os meses</option>
                          {MESES_LABELS.map((m,i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
                        </select>
                        <select value={filtro.ano} onChange={e => setFiltro(f=>({...f,ano:e.target.value}))} className={inp+' !py-1.5 w-auto text-xs'}>
                          <option value="">Todos os anos</option>
                          {['2024','2025','2026'].map(a => <option key={a}>{a}</option>)}
                        </select>
                        {(filtro.mes||filtro.ano) && <button onClick={() => setFiltro({mes:'',ano:''})} className="text-xs text-gray-500 hover:text-gray-700">Limpar</button>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-white rounded-lg p-2.5 text-center">
                          <p className="text-xs text-gray-500">Saldo Inicial</p>
                          <p className="font-semibold text-sm text-gray-700">{fmt(c.saldoInicial)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2.5 text-center">
                          <p className="text-xs text-gray-500">Entradas</p>
                          <p className="font-semibold text-sm text-green-600">{fmt(entradas)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2.5 text-center">
                          <p className="text-xs text-gray-500">Saídas</p>
                          <p className="font-semibold text-sm text-red-600">{fmt(saidas)}</p>
                        </div>
                      </div>
                      {txF.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">Nenhuma movimentação</p>
                      ) : (
                        <div className="flex flex-col gap-0 max-h-52 overflow-y-auto">
                          {txF.map(t => (
                            <div key={t.id} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-100 last:border-0">
                              <div>
                                <span className={t.tipo==='Receita'?'font-medium text-green-600':'font-medium text-red-600'}>{t.tipo==='Receita'?'+':'-'}</span>
                                <span className="text-gray-600 ml-1">{t.categoria}</span>
                                <span className="text-gray-400 ml-1">· {t.data.split('-').reverse().join('/')}</span>
                              </div>
                              <span className={t.tipo==='Receita'?'font-semibold text-green-600':'font-semibold text-red-600'}>{fmt(t.valor)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {modalBanco && (
        <Modal titulo="Novo Banco" onClose={() => setModalBanco(false)}>
          <Campo label="Nome do Banco"><input type="text" value={formBanco.nome} onChange={e => setFormBanco({...formBanco,nome:e.target.value})} className={inp} placeholder="Ex: Nubank, Itaú..."/></Campo>
          <Campo label="Cor">
            <div className="flex items-center gap-3">
              <input type="color" value={formBanco.cor} onChange={e => setFormBanco({...formBanco,cor:e.target.value})} className="w-12 h-10 rounded-lg cursor-pointer border border-gray-200"/>
              <span className="text-sm text-gray-500">{formBanco.cor}</span>
            </div>
          </Campo>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalBanco(false)} className={btnS+' flex-1'}>Cancelar</button>
            <button onClick={adicionarBanco} className={btnP+' flex-1'}>Adicionar</button>
          </div>
        </Modal>
      )}

      {modalConta && (
        <Modal titulo={'Nova Conta — '+(bancos.find(b=>b.id===modalConta)?.nome||'')} onClose={() => setModalConta(null)}>
          <Campo label="Tipo">
            <select value={formConta.tipo} onChange={e => setFormConta({...formConta,tipo:e.target.value})} className={inp}>
              {TIPOS_CONTA.map(t => <option key={t.tipo} value={t.tipo}>{t.label}</option>)}
            </select>
          </Campo>
          {formConta.tipo === 'Personalizada' && (
            <Campo label="Nome da Conta"><input type="text" value={formConta.nome} onChange={e => setFormConta({...formConta,nome:e.target.value})} className={inp} placeholder="Ex: Viagem, Reserva..."/></Campo>
          )}
          <Campo label="Saldo Inicial (R$)"><input type="number" step="0.01" value={formConta.saldoInicial} onChange={e => setFormConta({...formConta,saldoInicial:e.target.value})} className={inp} placeholder="0,00"/></Campo>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalConta(null)} className={btnS+' flex-1'}>Cancelar</button>
            <button onClick={() => adicionarConta(modalConta)} className={btnP+' flex-1'}>Adicionar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── CONFIGURAÇÕES ───────────────────────────────────────────────────────────

function Configuracoes({ metas, setMetas }) {
  const [form, setForm] = useState({ gastoMensal:String(metas.gastoMensal||''), limiteCartao:String(metas.limiteCartao||'') });
  const [salvo, setSalvo] = useState(false);

  function salvar() {
    setMetas({ gastoMensal:money(form.gastoMensal), limiteCartao:money(form.limiteCartao) });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Target size={16}/>Metas Mensais</h3>
        <div className="flex flex-col gap-4">
          <Campo label="Meta de Gasto Mensal (R$)">
            <input type="number" step="0.01" min="0" value={form.gastoMensal} onChange={e => setForm({...form,gastoMensal:e.target.value})} className={inp} placeholder="Ex: 5000"/>
          </Campo>
          <Campo label="Meta de Uso de Cartões (R$)">
            <input type="number" step="0.01" min="0" value={form.limiteCartao} onChange={e => setForm({...form,limiteCartao:e.target.value})} className={inp} placeholder="Ex: 2000"/>
          </Campo>
          <button onClick={salvar} className={btnP+' flex items-center gap-2 w-fit'+(salvo?' !bg-green-600':'')}>
            {salvo ? <><CheckCircle size={16}/>Salvo!</> : 'Salvar Metas'}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-red-600"><AlertTriangle size={16}/>Zona de Perigo</h3>
        <p className="text-sm text-gray-500 mb-4">Apagar todos os dados. Ação irreversível.</p>
        <button onClick={() => {
          if (confirm('Apagar TODOS os dados permanentemente?')) {
            ['transactions','cartoes','bancos','despesasFuturas','metas'].forEach(k => localStorage.removeItem('cf_'+k));
            window.location.reload();
          }
        }} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium">
          Apagar Todos os Dados
        </button>
      </div>
    </div>
  );
}
