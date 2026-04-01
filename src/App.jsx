import React, { useState, useEffect } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, CreditCard, AlertTriangle,
  Plus, Filter, Target, Settings, Home, Trash2, Edit,
  ArrowUpCircle, ArrowDownCircle, CalendarDays, CheckCircle,
  Building2, FileText, X, ChevronDown, ChevronUp, LogOut, Loader2, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from './lib/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = v => `R$ ${Number(parseFloat(v||0).toFixed(2)).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
const money = v => Number(parseFloat(v||0).toFixed(2));
const today = () => new Date().toISOString().split('T')[0];
const mesAtual = () => new Date().toISOString().slice(0,7);
const uid = () => String(Date.now()) + String(Math.floor(Math.random()*10000));
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function getMes(offset) { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+(offset||0)); return d.toISOString().slice(0,7); }
function getMesLabel(m) { if(!m)return''; const[ano,mes]=m.split('-'); return MESES[parseInt(mes)-1]+'/'+ano.slice(2); }

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS = {
  'Receita':['Salário','Freelance','Investimentos','Outros'],
  'Despesa Fixa':['Aluguel','Condomínio','Luz','Água','Internet','Telefone','Academia','Streaming','Outros'],
  'Despesa Variável':['Mercado','Alimentação','Transporte','Lazer','Saúde','Educação','Vestuário','Outros'],
  'Cartão de Crédito':['Compras','Serviços','Assinaturas','Outros'],
  'Investimentos':['Ações','Fundos','Tesouro','Criptomoedas','Outros'],
};
const FORMAS_PAG = ['Dinheiro','Pix','Débito','Transferência','Boleto'];
const TIPOS_CONTA = [
  {tipo:'Corrente',label:'💳 Conta Corrente'},{tipo:'Poupança',label:'🏦 Poupança'},
  {tipo:'Investimentos',label:'📈 Investimentos'},{tipo:'Salário',label:'💵 Conta Salário'},
  {tipo:'Jurídica',label:'🏢 Conta Jurídica'},{tipo:'Personalizada',label:'✨ Personalizada'},
];
const CORES = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

// ─── Mappers DB ─── App ────────────────────────────────────────────────────────

const mapTx = t => ({id:t.id,tipo:t.tipo,categoria:t.categoria,valor:money(t.valor),data:t.data,pagamento:t.pagamento||'',obs:t.obs||'',mes:t.mes,bancoId:t.banco_id,contaId:t.conta_id,cartaoId:t.cartao_id});
const mapCartao = c => ({id:c.id,nome:c.nome,limite:money(c.limite),usado:money(c.usado),dataFechamento:c.data_fechamento,dataVencimento:c.data_vencimento});
const mapBanco = b => ({id:b.id,nome:b.nome,cor:b.cor,cartoesVinculados:Array.isArray(b.cartoes_vinculados)?b.cartoes_vinculados:[],contas:[]});
const mapConta = c => ({id:c.id,bancoId:c.banco_id,tipo:c.tipo,nome:c.nome,saldoInicial:money(c.saldo_inicial),criadaEm:c.criada_em});
const mapDF = d => ({id:d.id,categoria:d.categoria,valor:money(d.valor),tipo:d.tipo,mes:d.mes});

const txToDB = (tx,uid) => ({id:tx.id,user_id:uid,tipo:tx.tipo,categoria:tx.categoria,valor:tx.valor,data:tx.data,pagamento:tx.pagamento,obs:tx.obs,mes:tx.mes,banco_id:tx.bancoId||null,conta_id:tx.contaId||null,cartao_id:tx.cartaoId||null});
const cartaoToDB = (c,uid) => ({id:c.id,user_id:uid,nome:c.nome,limite:c.limite,usado:c.usado,data_fechamento:c.dataFechamento,data_vencimento:c.dataVencimento});
const bancoToDB = (b,uid) => ({id:b.id,user_id:uid,nome:b.nome,cor:b.cor,cartoes_vinculados:b.cartoesVinculados||[]});
const contaToDB = (c,bancoId,uid) => ({id:c.id,user_id:uid,banco_id:bancoId,tipo:c.tipo,nome:c.nome,saldo_inicial:c.saldoInicial,criada_em:c.criadaEm||today()});
const dfToDB = (df,uid) => ({id:df.id,user_id:uid,categoria:df.categoria,valor:df.valor,tipo:df.tipo,mes:df.mes});

// ─── UI Atoms ────────────────────────────────────────────────────────────────

function Modal({titulo,onClose,children,footer}) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
      <div style={{background:'#1e293b',borderRadius:'14px',boxShadow:'0 25px 50px rgba(0,0,0,0.5)',width:'100%',maxWidth:'440px',maxHeight:'90vh',display:'flex',flexDirection:'column',border:'1px solid #334155'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px 16px',borderBottom:'1px solid #334155'}}>
          <h2 style={{fontSize:'17px',fontWeight:700,color:'#f1f5f9',margin:0}}>{titulo}</h2>
          <button onClick={onClose} style={{padding:'6px',background:'transparent',border:'none',cursor:'pointer',color:'#64748b',borderRadius:'8px',display:'flex',alignItems:'center'}} onMouseOver={e=>e.currentTarget.style.background='#334155'} onMouseOut={e=>e.currentTarget.style.background='transparent'}><X size={18}/></button>
        </div>
        <div style={{overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:'16px',flex:1}}>{children}</div>
        {footer && <div style={{padding:'16px 24px',borderTop:'1px solid #334155',display:'flex',gap:'12px',background:'#0f172a',borderRadius:'0 0 14px 14px'}}>{footer}</div>}
      </div>
    </div>
  );
}
function Campo({label,children,required}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
      <label style={{fontSize:'13px',fontWeight:500,color:'#94a3b8'}}>
        {label}{required&&<span style={{color:'#f87171',marginLeft:'2px'}}>*</span>}
      </label>
      {children}
    </div>
  );
}
const inp = "cf-input";
const btnP = "cf-btn-primary";
const btnS = "cf-btn-secondary";

function CardResumo({titulo,valor,icon:Icon,cor,sub,destaque}) {
  if(destaque) return (
    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-lg text-white col-span-2 lg:col-span-1" style={{padding:'20px 24px'}}>
      <div className="flex items-start justify-between" style={{marginBottom:'16px'}}>
        <p className="text-sm text-indigo-200 font-medium">{titulo}</p>
        <div style={{padding:'8px',background:'rgba(255,255,255,0.2)',borderRadius:'10px'}}><Icon size={18}/></div>
      </div>
      <p className="text-3xl font-bold tracking-tight">{fmt(valor)}</p>
      {sub && <p className="text-xs text-indigo-300" style={{marginTop:'6px'}}>{sub}</p>}
    </div>
  );
  const iconColors={green:'rgba(34,197,94,0.15)',red:'rgba(239,68,68,0.15)',blue:'rgba(59,130,246,0.15)',indigo:'rgba(99,102,241,0.15)'};
  const textColors={green:'#4ade80',red:'#f87171',blue:'#60a5fa',indigo:'#818cf8'};
  const ic=iconColors[cor]||iconColors.indigo;
  const tc=textColors[cor]||textColors.indigo;
  return (
    <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700" style={{padding:'20px 24px'}}>
      <div className="flex items-start justify-between" style={{marginBottom:'12px'}}>
        <p className="text-sm text-slate-400 font-medium">{titulo}</p>
        <div style={{padding:'8px',background:ic,borderRadius:'10px',color:tc}}><Icon size={17}/></div>
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{color:tc}}>{fmt(valor)}</p>
      {sub && <p className="text-xs text-slate-500" style={{marginTop:'4px'}}>{sub}</p>}
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────

function AuthScreen() {
  const [mode,setMode]=useState('login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    if (mode==='login') {
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error) setError(error.message);
    } else {
      const {error}=await supabase.auth.signUp({email,password});
      if(error) setError(error.message);
      else setSuccess('Conta criada! Verifique seu e-mail para confirmar.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200"><Wallet size={26} className="text-white"/></div>
          <div><h1 className="text-2xl font-bold text-gray-900">Controle Financeiro</h1><p className="text-sm text-gray-400 mt-0.5">Gestão pessoal inteligente</p></div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Campo label="E-mail"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className={inp} placeholder="seu@email.com" required/></Campo>
          <Campo label="Senha"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className={inp} placeholder="••••••••" required/></Campo>
          {error&&<p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          {success&&<p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}
          <button type="submit" disabled={loading} className={btnP+' flex items-center justify-center gap-2'}>
            {loading&&<Loader2 size={16} className="animate-spin"/>}
            {mode==='login'?'Entrar':'Criar conta'}
          </button>
        </form>
        <button onClick={()=>{setMode(m=>m==='login'?'signup':'login');setError('');setSuccess('');}} className="w-full text-center text-sm text-indigo-600 hover:text-indigo-800 mt-4">
          {mode==='login'?'Não tem conta? Criar agora':'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [session,setSession]=useState(null);
  const [loading,setLoading]=useState(true);
  const [aba,setAba]=useState('dashboard');
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const [transactions,setTransactions]=useState([]);
  const [cartoes,setCartoes]=useState([]);
  const [bancos,setBancos]=useState([]);
  const [despesasFuturas,setDespesasFuturas]=useState([]);
  const [metas,setMetas]=useState({gastoMensal:0,limiteCartao:0});

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setSession(session);
      if(session) loadAll(session.user.id);
      else setLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setSession(session);
      if(!session){setLoading(false);setTransactions([]);setCartoes([]);setBancos([]);setDespesasFuturas([]);setMetas({gastoMensal:0,limiteCartao:0});}
    });
    return ()=>subscription.unsubscribe();
  },[]);

  async function loadAll(userId) {
    setLoading(true);
    const [txR,cR,bR,coR,dfR,mR]=await Promise.all([
      supabase.from('transactions').select('*').eq('user_id',userId).order('data',{ascending:false}),
      supabase.from('cartoes').select('*').eq('user_id',userId).order('created_at'),
      supabase.from('bancos').select('*').eq('user_id',userId).order('created_at'),
      supabase.from('contas').select('*').eq('user_id',userId).order('created_at'),
      supabase.from('despesas_futuras').select('*').eq('user_id',userId).order('created_at'),
      supabase.from('metas').select('*').eq('user_id',userId).maybeSingle(),
    ]);
    setTransactions((txR.data||[]).map(mapTx));
    setCartoes((cR.data||[]).map(mapCartao));
    const contas=(coR.data||[]).map(mapConta);
    setBancos((bR.data||[]).map(b=>({...mapBanco(b),contas:contas.filter(c=>c.bancoId===b.id)})));
    setDespesasFuturas((dfR.data||[]).map(mapDF));
    if(mR.data) setMetas({gastoMensal:money(mR.data.gasto_mensal),limiteCartao:money(mR.data.limite_cartao)});
    setLoading(false);
  }

  const userId=session?.user?.id;

  async function addTx(tx){setTransactions(p=>[tx,...p]);await supabase.from('transactions').insert(txToDB(tx,userId));}
  async function updateTx(tx){setTransactions(p=>p.map(t=>t.id===tx.id?tx:t));await supabase.from('transactions').update(txToDB(tx,userId)).eq('id',tx.id);}
  async function deleteTx(id){setTransactions(p=>p.filter(t=>t.id!==id));await supabase.from('transactions').delete().eq('id',id);}
  async function addCartao(c){setCartoes(p=>[...p,c]);await supabase.from('cartoes').insert(cartaoToDB(c,userId));}
  async function updateCartao(c){setCartoes(p=>p.map(x=>x.id===c.id?c:x));await supabase.from('cartoes').update(cartaoToDB(c,userId)).eq('id',c.id);}
  async function deleteCartao(id){
    const af=bancos.filter(b=>(b.cartoesVinculados||[]).includes(id));
    setCartoes(p=>p.filter(c=>c.id!==id));
    setBancos(p=>p.map(b=>({...b,cartoesVinculados:(b.cartoesVinculados||[]).filter(cid=>cid!==id)})));
    await supabase.from('cartoes').delete().eq('id',id);
    for(const b of af){const nv=(b.cartoesVinculados||[]).filter(cid=>cid!==id);await supabase.from('bancos').update({cartoes_vinculados:nv}).eq('id',b.id);}
  }
  async function addBanco(b){setBancos(p=>[...p,b]);await supabase.from('bancos').insert(bancoToDB(b,userId));}
  async function deleteBanco(id){setBancos(p=>p.filter(b=>b.id!==id));await supabase.from('bancos').delete().eq('id',id);}
  async function addConta(bancoId,conta){setBancos(p=>p.map(b=>b.id===bancoId?{...b,contas:[...(b.contas||[]),conta]}:b));await supabase.from('contas').insert(contaToDB(conta,bancoId,userId));}
  async function deleteConta(bancoId,contaId){setBancos(p=>p.map(b=>b.id===bancoId?{...b,contas:b.contas.filter(c=>c.id!==contaId)}:b));await supabase.from('contas').delete().eq('id',contaId);}
  async function vincularCartao(cartaoId,bancoId){
    const updated=bancos.map(b=>{const v=Array.isArray(b.cartoesVinculados)?b.cartoesVinculados:[];if(b.id===bancoId)return{...b,cartoesVinculados:[...v.filter(id=>id!==cartaoId),cartaoId]};return{...b,cartoesVinculados:v.filter(id=>id!==cartaoId)};});
    setBancos(updated);
    for(const b of updated){const orig=bancos.find(x=>x.id===b.id);if(JSON.stringify(orig?.cartoesVinculados)!==JSON.stringify(b.cartoesVinculados))await supabase.from('bancos').update({cartoes_vinculados:b.cartoesVinculados}).eq('id',b.id);}
  }
  async function desvincularCartao(cartaoId){
    const af=bancos.filter(b=>(b.cartoesVinculados||[]).includes(cartaoId));
    setBancos(p=>p.map(b=>({...b,cartoesVinculados:(b.cartoesVinculados||[]).filter(id=>id!==cartaoId)})));
    for(const b of af){const nv=(b.cartoesVinculados||[]).filter(id=>id!==cartaoId);await supabase.from('bancos').update({cartoes_vinculados:nv}).eq('id',b.id);}
  }
  async function addDF(df){setDespesasFuturas(p=>[...p,df]);await supabase.from('despesas_futuras').insert(dfToDB(df,userId));}
  async function updateDF(df){setDespesasFuturas(p=>p.map(d=>d.id===df.id?df:d));await supabase.from('despesas_futuras').update(dfToDB(df,userId)).eq('id',df.id);}
  async function deleteDF(id){setDespesasFuturas(p=>p.filter(d=>d.id!==id));await supabase.from('despesas_futuras').delete().eq('id',id);}
  async function saveMetas(m){setMetas(m);await supabase.from('metas').upsert({user_id:userId,gasto_mensal:m.gastoMensal,limite_cartao:m.limiteCartao});}

  function getContasFlat(){return bancos.flatMap(b=>(b.contas||[]).map(c=>({...c,bancoId:b.id,bancoNome:b.nome,bancoCor:b.cor})));}

  if(!session) return <AuthScreen/>;
  if(loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="flex flex-col items-center gap-3 text-slate-400"><Loader2 size={32} className="animate-spin text-indigo-400"/><p className="text-sm">Carregando seus dados...</p></div></div>;

  const tabs=[
    {id:'dashboard',label:'Dashboard',icon:Home},{id:'receitas',label:'Receitas',icon:ArrowUpCircle},
    {id:'despesas',label:'Despesas',icon:ArrowDownCircle},{id:'planejamento',label:'Planejamento',icon:CalendarDays},
    {id:'cartoes',label:'Cartões',icon:CreditCard},{id:'bancos',label:'Bancos',icon:Building2},
    {id:'config',label:'Config',icon:Settings},
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex" style={{overflowX:'hidden'}}>
      {/* Sidebar */}
      <aside style={{background:'#0f172a',display:'flex',flexDirection:'column',flexShrink:0,position:'sticky',top:0,height:'100vh',overflow:'visible',transition:'width 0.3s',width:sidebarOpen?'220px':'68px',borderRight:'1px solid #1e293b'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',padding:'24px 16px 20px',justifyContent:sidebarOpen?'space-between':'center',gap:'12px'}}>
          {sidebarOpen&&(
            <div style={{display:'flex',alignItems:'center',gap:'10px',minWidth:0}}>
              <div style={{padding:'8px',background:'linear-gradient(135deg,#6366f1,#4f46e5)',borderRadius:'10px',flexShrink:0,display:'flex',boxShadow:'0 4px 12px rgba(99,102,241,0.4)'}}>
                <Wallet size={16} color="#fff"/>
              </div>
              <div style={{minWidth:0}}>
                <p style={{fontSize:'14px',fontWeight:700,color:'#f1f5f9',lineHeight:'1.2',letterSpacing:'-0.01em'}}>Controle</p>
                <p style={{fontSize:'11px',color:'#475569',lineHeight:'1.2',marginTop:'1px'}}>Financeiro</p>
              </div>
            </div>
          )}
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{padding:'6px',background:'transparent',border:'none',cursor:'pointer',color:'#475569',borderRadius:'8px',display:'flex',alignItems:'center',flexShrink:0,transition:'color 0.15s'}} onMouseOver={e=>e.currentTarget.style.color='#94a3b8'} onMouseOut={e=>e.currentTarget.style.color='#475569'}>
            {sidebarOpen?<PanelLeftClose size={16}/>:<PanelLeftOpen size={16}/>}
          </button>
        </div>
        {/* Nav */}
        <nav style={{flex:1,padding:'0 10px',display:'flex',flexDirection:'column',gap:'2px',overflowY:'auto',overflowX:'visible'}}>
          {tabs.map(t=>{
            const active=aba===t.id;
            return(
              <div key={t.id} style={{position:'relative'}} className="group">
                <button onClick={()=>setAba(t.id)} style={{
                  display:'flex',alignItems:'center',gap:'10px',width:'100%',border:'none',cursor:'pointer',
                  borderRadius:'10px',transition:'all 0.15s',
                  padding: sidebarOpen ? '10px 12px' : '10px 0',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  background: active ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'transparent',
                  color: active ? '#fff' : '#64748b',
                  boxShadow: active ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                  fontWeight: active ? 600 : 500,
                  fontSize:'13.5px',
                  letterSpacing:'-0.01em',
                }} onMouseOver={e=>{if(!active){e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.color='#cbd5e1';}}} onMouseOut={e=>{if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#64748b';}}}>
                  <t.icon size={17} style={{flexShrink:0}}/>
                  {sidebarOpen&&<span>{t.label}</span>}
                </button>
                {!sidebarOpen&&(
                  <span style={{position:'absolute',left:'calc(100% + 12px)',top:'50%',transform:'translateY(-50%)',background:'#1e293b',color:'#f1f5f9',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',whiteSpace:'nowrap',pointerEvents:'none',border:'1px solid #334155',boxShadow:'0 4px 16px rgba(0,0,0,0.4)',zIndex:50}} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
        {/* Footer */}
        <div style={{borderTop:'1px solid #1e293b',padding:'16px 10px',display:'flex',justifyContent:sidebarOpen?'flex-start':'center'}}>
          {sidebarOpen?(
            <div style={{display:'flex',alignItems:'center',gap:'10px',width:'100%',padding:'0 4px'}}>
              <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#4f46e5)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'12px',fontWeight:700,flexShrink:0}}>
                {session.user.email[0].toUpperCase()}
              </div>
              <p style={{fontSize:'12px',color:'#475569',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{session.user.email}</p>
              <button onClick={()=>supabase.auth.signOut()} style={{padding:'6px',background:'transparent',border:'none',cursor:'pointer',color:'#475569',borderRadius:'8px',display:'flex',flexShrink:0}} onMouseOver={e=>e.currentTarget.style.color='#94a3b8'} onMouseOut={e=>e.currentTarget.style.color='#475569'} title="Sair"><LogOut size={14}/></button>
            </div>
          ):(
            <div style={{position:'relative'}} className="group">
              <button onClick={()=>supabase.auth.signOut()} style={{padding:'8px',background:'transparent',border:'none',cursor:'pointer',color:'#475569',borderRadius:'8px',display:'flex'}} onMouseOver={e=>e.currentTarget.style.color='#94a3b8'} onMouseOut={e=>e.currentTarget.style.color='#475569'} title="Sair"><LogOut size={15}/></button>
              <span style={{position:'absolute',left:'calc(100% + 12px)',top:'50%',transform:'translateY(-50%)',background:'#1e293b',color:'#f1f5f9',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',whiteSpace:'nowrap',pointerEvents:'none',border:'1px solid #334155',zIndex:50}} className="opacity-0 group-hover:opacity-100 transition-opacity">Sair</span>
            </div>
          )}
        </div>
      </aside>
      {/* Content */}
      <main className="flex-1 min-h-screen overflow-x-hidden" style={{padding:'28px 48px'}}>
        <div>
          {aba==='dashboard'    && <Dashboard transactions={transactions} cartoes={cartoes} metas={metas}/>}
          {aba==='receitas'     && <Receitas transactions={transactions} getContasFlat={getContasFlat} onAdd={addTx} onUpdate={updateTx} onDelete={deleteTx}/>}
          {aba==='despesas'     && <Despesas transactions={transactions} cartoes={cartoes} getContasFlat={getContasFlat} onAddTx={addTx} onUpdateTx={updateTx} onDeleteTx={deleteTx} onUpdateCartao={updateCartao}/>}
          {aba==='planejamento' && <Planejamento despesasFuturas={despesasFuturas} transactions={transactions} onAdd={addDF} onUpdate={updateDF} onDelete={deleteDF}/>}
          {aba==='cartoes'      && <Cartoes cartoes={cartoes} transactions={transactions} bancos={bancos} onAddCartao={addCartao} onUpdateCartao={updateCartao} onDeleteCartao={deleteCartao} onAddTx={addTx} onVincular={vincularCartao} onDesvincular={desvincularCartao}/>}
          {aba==='bancos'       && <Bancos bancos={bancos} transactions={transactions} onAddBanco={addBanco} onDeleteBanco={deleteBanco} onAddConta={addConta} onDeleteConta={deleteConta}/>}
          {aba==='config'       && <Configuracoes metas={metas} onSave={saveMetas} userId={userId}/>}
        </div>
      </main>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function Dashboard({transactions,cartoes,metas}) {
  const mes=mesAtual();
  const txMes=transactions.filter(t=>t.mes===mes);
  const receitas=txMes.filter(t=>t.tipo==='Receita').reduce((s,t)=>s+t.valor,0);
  const despesas=txMes.filter(t=>t.tipo!=='Receita').reduce((s,t)=>s+t.valor,0);
  const saldo=receitas-despesas;
  const totalCartoes=cartoes.reduce((s,c)=>s+c.usado,0);
  const ultimos6=Array.from({length:6},(_,i)=>{const m=getMes(i-5);const tx=transactions.filter(t=>t.mes===m);return{mes:getMesLabel(m),Receitas:tx.filter(t=>t.tipo==='Receita').reduce((s,t)=>s+t.valor,0),Despesas:tx.filter(t=>t.tipo!=='Receita').reduce((s,t)=>s+t.valor,0)};});
  const catMap={};txMes.filter(t=>t.tipo!=='Receita').forEach(t=>{catMap[t.categoria]=(catMap[t.categoria]||0)+t.valor;});
  const pizzaData=Object.entries(catMap).map(([name,value])=>({name,value}));
  const alertas=[];
  if(metas.gastoMensal>0&&despesas>metas.gastoMensal) alertas.push('Despesas ('+fmt(despesas)+') acima da meta de '+fmt(metas.gastoMensal));
  cartoes.forEach(c=>{const p=c.limite>0?(c.usado/c.limite)*100:0;if(p>=100)alertas.push('Cartão '+c.nome+' estourado');else if(p>=90)alertas.push('Cartão '+c.nome+' com limite crítico ('+p.toFixed(0)+'%)');});

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2"><h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1><p className="text-slate-400 text-sm mt-0.5">{getMesLabel(mes)} — visão geral do mês</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardResumo titulo="Saldo do Mês" valor={saldo} icon={Wallet} cor={saldo>=0?'indigo':'red'} destaque/>
        <CardResumo titulo="Receitas" valor={receitas} icon={TrendingUp} cor="green"/>
        <CardResumo titulo="Despesas" valor={despesas} icon={TrendingDown} cor="red"/>
        <CardResumo titulo="Cartões Usados" valor={totalCartoes} icon={CreditCard} cor="blue"/>
      </div>
      {alertas.length>0&&<div className="bg-amber-900/30 border border-amber-700/50 rounded-2xl p-4 flex flex-col gap-2"><div className="flex items-center gap-2 font-semibold text-amber-400"><AlertTriangle size={18}/>Alertas</div>{alertas.map((a,i)=><p key={i} className="text-sm text-amber-300 ml-6">{a}</p>)}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700" style={{padding:'24px'}}>
          <h3 className="font-semibold text-white" style={{marginBottom:'4px'}}>Receitas vs Despesas</h3>
          <p className="text-xs text-slate-400" style={{marginBottom:'20px'}}>Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ultimos6} barGap={6} barCategoryGap="35%" margin={{top:4,right:8,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false}/>
              <XAxis dataKey="mes" tick={{fontSize:12,fill:'#64748b'}} axisLine={false} tickLine={false} interval={0}/>
              <YAxis tick={{fontSize:11,fill:'#64748b'}} tickFormatter={v=>'R$'+(v/1000).toFixed(0)+'k'} axisLine={false} tickLine={false} width={48}/>
              <Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:'12px',border:'1px solid #334155',background:'#1e293b',color:'#f1f5f9',boxShadow:'0 4px 24px rgba(0,0,0,0.40)',padding:'10px 14px'}}/>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{paddingTop:'16px',color:'#94a3b8'}}/>
              <Bar dataKey="Receitas" fill="#22c55e" radius={[6,6,0,0]}/>
              <Bar dataKey="Despesas" fill="#f43f5e" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700" style={{padding:'24px'}}>
          <h3 className="font-semibold text-white" style={{marginBottom:'4px'}}>Despesas por Categoria</h3>
          <p className="text-xs text-slate-400" style={{marginBottom:'20px'}}>Mês atual</p>
          {pizzaData.length>0?(
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pizzaData} cx="50%" cy="46%" outerRadius={95} innerRadius={40} dataKey="value" paddingAngle={3}
                  label={({name,percent})=>name+' '+(percent*100).toFixed(0)+'%'} labelLine={{stroke:'#475569',strokeWidth:1}}>
                  {pizzaData.map((_,i)=><Cell key={i} fill={CORES[i%CORES.length]}/>)}
                </Pie>
                <Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:'12px',border:'1px solid #334155',background:'#1e293b',color:'#f1f5f9',boxShadow:'0 4px 24px rgba(0,0,0,0.40)',padding:'10px 14px'}}/>
              </PieChart>
            </ResponsiveContainer>
          ):<div className="h-[260px] flex flex-col items-center justify-center gap-2 text-slate-600"><FileText size={32}/><span className="text-sm">Sem despesas no mês</span></div>}
        </div>
      </div>
      {(metas.gastoMensal>0||metas.limiteCartao>0)&&(
        <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700" style={{padding:'20px 24px'}}>
          <h3 className="font-semibold text-slate-200 flex items-center gap-2" style={{marginBottom:'16px'}}><Target size={16}/>Metas do Mês</h3>
          <div className="flex flex-col gap-3">
            {metas.gastoMensal>0&&<div><div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Gasto Mensal</span><span className={despesas>metas.gastoMensal?'text-red-400 font-semibold':'text-slate-400'}>{fmt(despesas)} / {fmt(metas.gastoMensal)}</span></div><div className="bg-slate-700 rounded-full h-2"><div className={'h-2 rounded-full '+(despesas>metas.gastoMensal?'bg-red-500':'bg-indigo-500')} style={{width:Math.min((despesas/metas.gastoMensal)*100,100)+'%'}}/></div></div>}
            {metas.limiteCartao>0&&<div><div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Uso de Cartões</span><span className={totalCartoes>metas.limiteCartao?'text-red-400 font-semibold':'text-slate-400'}>{fmt(totalCartoes)} / {fmt(metas.limiteCartao)}</span></div><div className="bg-slate-700 rounded-full h-2"><div className={'h-2 rounded-full '+(totalCartoes>metas.limiteCartao?'bg-red-500':'bg-blue-500')} style={{width:Math.min((totalCartoes/metas.limiteCartao)*100,100)+'%'}}/></div></div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RECEITAS ─────────────────────────────────────────────────────────────────

function Receitas({transactions,getContasFlat,onAdd,onUpdate,onDelete}) {
  const [modal,setModal]=useState(false);
  const [editando,setEditando]=useState(null);
  const [filtroMes,setFiltroMes]=useState(mesAtual());
  const [form,setForm]=useState({categoria:'',valor:'',data:today(),obs:'',contaId:null});
  const contas=getContasFlat();
  const mesesOpts=Array.from({length:12},(_,i)=>getMes(i-6));
  const lista=transactions.filter(t=>t.tipo==='Receita'&&t.mes===filtroMes).sort((a,b)=>b.data.localeCompare(a.data));
  const total=lista.reduce((s,t)=>s+t.valor,0);

  function abrir(tx){setForm(tx?{categoria:tx.categoria,valor:String(tx.valor),data:tx.data,obs:tx.obs||'',contaId:tx.contaId}:{categoria:'',valor:'',data:today(),obs:'',contaId:null});setEditando(tx?tx.id:null);setModal(true);}
  async function salvar(){
    if(!form.categoria||!form.valor||!form.data||!form.contaId)return;
    const conta=contas.find(c=>c.id===form.contaId);
    const tx={id:editando||uid(),tipo:'Receita',categoria:form.categoria,valor:money(form.valor),data:form.data,pagamento:'Recebimento',obs:form.obs,mes:form.data.slice(0,7),bancoId:conta?.bancoId||null,contaId:form.contaId};
    if(editando)await onUpdate(tx);else await onAdd(tx);
    setModal(false);
  }
  async function excluir(id){if(confirm('Excluir receita?'))await onDelete(id);}

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-white">Receitas</h1><p className="text-slate-400 text-sm">Total: <span className="font-semibold text-green-400">{fmt(total)}</span></p></div><button onClick={()=>abrir(null)} className={btnP+' flex items-center gap-2'}><Plus size={16}/>Nova Receita</button></div>
      <div className="flex items-center gap-3"><Filter size={16} className="text-slate-500"/><select value={filtroMes} onChange={e=>setFiltroMes(e.target.value)} className={inp+' w-auto'}>{mesesOpts.map(m=><option key={m} value={m}>{getMesLabel(m)}</option>)}</select></div>
      <div className="flex flex-col gap-3">
        {lista.length===0&&<div className="bg-slate-800 rounded-2xl p-10 text-center text-slate-500 shadow-sm border border-slate-700">Nenhuma receita em {getMesLabel(filtroMes)}</div>}
        {lista.map(tx=>{const conta=contas.find(c=>c.id===tx.contaId);return(
          <div key={tx.id} className="bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="p-2.5 bg-green-500/20 rounded-xl"><ArrowUpCircle size={18} className="text-green-400"/></div><div><p className="font-semibold text-slate-100">{tx.categoria}</p><p className="text-xs text-slate-500">{tx.data.split('-').reverse().join('/')}{conta&&' · '+conta.bancoNome+' - '+conta.nome}{tx.obs&&' · '+tx.obs}</p></div></div>
            <div className="flex items-center gap-3"><span className="font-bold text-green-400">{fmt(tx.valor)}</span><button onClick={()=>abrir(tx)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500"><Edit size={15}/></button><button onClick={()=>excluir(tx.id)} className="p-1.5 hover:bg-red-900/30 rounded-lg text-red-400"><Trash2 size={15}/></button></div>
          </div>
        );})}
      </div>
      {modal&&(<Modal titulo="💰 Nova Receita" onClose={()=>setModal(false)} footer={<><button onClick={()=>setModal(false)} className={btnS+' flex-1'}>Cancelar</button><button onClick={salvar} className={btnP+' flex-1'}>Salvar</button></>}>
        <Campo label="Categoria"><select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})} className={inp}><option value="">Selecione...</option>{CATEGORIAS['Receita'].map(c=><option key={c}>{c}</option>)}</select></Campo>
        <Campo label="Valor (R$)"><input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className={inp} placeholder="0,00"/></Campo>
        <Campo label="Data"><input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} className={inp}/></Campo>
        <Campo label="Conta Bancária *"><select value={form.contaId||''} onChange={e=>setForm({...form,contaId:e.target.value||null})} className={inp}><option value="">Selecione...</option>{contas.map(c=><option key={c.id} value={c.id}>{c.bancoNome} – {c.nome}</option>)}</select></Campo>
        <Campo label="Observações"><input type="text" value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})} className={inp} placeholder="Opcional"/></Campo>
      </Modal>)}
    </div>
  );
}

// ─── DESPESAS ─────────────────────────────────────────────────────────────────

function Despesas({transactions,cartoes,getContasFlat,onAddTx,onUpdateTx,onDeleteTx,onUpdateCartao}) {
  const [modal,setModal]=useState(false);
  const [editando,setEditando]=useState(null);
  const [filtroMes,setFiltroMes]=useState(mesAtual());
  const [filtroTipo,setFiltroTipo]=useState('');
  const [form,setForm]=useState({tipo:'Despesa Variável',categoria:'',valor:'',data:today(),pagamento:'',obs:'',contaId:null,cartaoId:null});
  const contas=getContasFlat();
  const mesesOpts=Array.from({length:12},(_,i)=>getMes(i-6));
  const tiposDespesa=['Despesa Fixa','Despesa Variável','Cartão de Crédito','Investimentos'];
  let lista=transactions.filter(t=>t.tipo!=='Receita'&&t.mes===filtroMes).sort((a,b)=>b.data.localeCompare(a.data));
  if(filtroTipo)lista=lista.filter(t=>t.tipo===filtroTipo);
  const total=lista.reduce((s,t)=>s+t.valor,0);
  const corTipo=t=>t==='Despesa Fixa'?'text-orange-600 bg-orange-50':t==='Despesa Variável'?'text-red-600 bg-red-50':t==='Cartão de Crédito'?'text-blue-600 bg-blue-50':t==='Investimentos'?'text-purple-600 bg-purple-50':'text-gray-600 bg-gray-100';

  function abrir(tx){setForm(tx?{tipo:tx.tipo,categoria:tx.categoria,valor:String(tx.valor),data:tx.data,pagamento:tx.pagamento||'',obs:tx.obs||'',contaId:tx.contaId||null,cartaoId:tx.cartaoId||null}:{tipo:'Despesa Variável',categoria:'',valor:'',data:today(),pagamento:'',obs:'',contaId:null,cartaoId:null});setEditando(tx?tx.id:null);setModal(true);}
  async function salvar(){
    if(!form.categoria||!form.valor||!form.data||!form.pagamento)return;
    const conta=contas.find(c=>c.id===form.contaId);
    const tx={id:editando||uid(),tipo:form.tipo,categoria:form.categoria,valor:money(form.valor),data:form.data,pagamento:form.pagamento,obs:form.obs,mes:form.data.slice(0,7),bancoId:conta?.bancoId||null,contaId:form.contaId||null,cartaoId:form.tipo==='Cartão de Crédito'?form.cartaoId:null};
    if(form.tipo==='Cartão de Crédito'&&form.cartaoId){const c=cartoes.find(x=>x.id===form.cartaoId);if(c){const ant=editando?(transactions.find(t=>t.id===editando)?.valor||0):0;await onUpdateCartao({...c,usado:money(c.usado-ant+tx.valor)});}}
    if(editando)await onUpdateTx(tx);else await onAddTx(tx);
    setModal(false);
  }
  async function excluir(id){
    if(!confirm('Excluir despesa?'))return;
    const tx=transactions.find(t=>t.id===id);
    if(tx?.tipo==='Cartão de Crédito'&&tx.cartaoId){const c=cartoes.find(x=>x.id===tx.cartaoId);if(c)await onUpdateCartao({...c,usado:money(c.usado-tx.valor)});}
    await onDeleteTx(id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-white">Despesas</h1><p className="text-slate-400 text-sm">Total: <span className="font-semibold text-red-400">{fmt(total)}</span></p></div><button onClick={()=>abrir(null)} className={btnP+' flex items-center gap-2'}><Plus size={16}/>Nova Despesa</button></div>
      <div className="flex items-center gap-3 flex-wrap"><Filter size={16} className="text-slate-500"/><select value={filtroMes} onChange={e=>setFiltroMes(e.target.value)} className={inp+' w-auto'}>{mesesOpts.map(m=><option key={m} value={m}>{getMesLabel(m)}</option>)}</select><select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} className={inp+' w-auto'}><option value="">Todos os tipos</option>{tiposDespesa.map(t=><option key={t}>{t}</option>)}</select></div>
      <div className="flex flex-col gap-3">
        {lista.length===0&&<div className="bg-slate-800 rounded-2xl p-10 text-center text-slate-500 shadow-sm border border-slate-700">Nenhuma despesa no período</div>}
        {lista.map(tx=>{const conta=contas.find(c=>c.id===tx.contaId);const cartao=cartoes.find(c=>c.id===tx.cartaoId);return(
          <div key={tx.id} className="bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className={'p-2.5 rounded-xl '+corTipo(tx.tipo)}><ArrowDownCircle size={18}/></div><div><div className="flex items-center gap-2"><p className="font-semibold text-slate-100">{tx.categoria}</p><span className={'text-xs px-2 py-0.5 rounded-full font-medium '+corTipo(tx.tipo)}>{tx.tipo}</span></div><p className="text-xs text-slate-500">{tx.data.split('-').reverse().join('/')}{tx.pagamento&&' · '+tx.pagamento}{cartao&&' · '+cartao.nome}{conta&&' · '+conta.bancoNome}{tx.obs&&' · '+tx.obs}</p></div></div>
            <div className="flex items-center gap-3"><span className="font-bold text-red-400">{fmt(tx.valor)}</span><button onClick={()=>abrir(tx)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500"><Edit size={15}/></button><button onClick={()=>excluir(tx.id)} className="p-1.5 hover:bg-red-900/30 rounded-lg text-red-400"><Trash2 size={15}/></button></div>
          </div>
        );})}
      </div>
      {modal&&(<Modal titulo="💸 Nova Despesa" onClose={()=>setModal(false)} footer={<><button onClick={()=>setModal(false)} className={btnS+' flex-1'}>Cancelar</button><button onClick={salvar} className={btnP+' flex-1'}>Salvar</button></>}>
        <Campo label="Tipo"><select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value,categoria:''})} className={inp}>{tiposDespesa.map(t=><option key={t}>{t}</option>)}</select></Campo>
        <Campo label="Categoria"><select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})} className={inp}><option value="">Selecione...</option>{(CATEGORIAS[form.tipo]||[]).map(c=><option key={c}>{c}</option>)}</select></Campo>
        <Campo label="Valor (R$)"><input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className={inp} placeholder="0,00"/></Campo>
        <Campo label="Data"><input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} className={inp}/></Campo>
        <Campo label="Forma de Pagamento *"><select value={form.pagamento} onChange={e=>setForm({...form,pagamento:e.target.value})} className={inp}><option value="">Selecione...</option>{FORMAS_PAG.map(f=><option key={f}>{f}</option>)}{cartoes.map(c=><option key={'c'+c.id} value={'Cartão '+c.nome}>Cartão {c.nome}</option>)}</select></Campo>
        {form.tipo==='Cartão de Crédito'&&<Campo label="Cartão"><select value={form.cartaoId||''} onChange={e=>setForm({...form,cartaoId:e.target.value||null})} className={inp}><option value="">Selecione...</option>{cartoes.map(c=><option key={c.id} value={c.id}>{c.nome} (disp: {fmt(c.limite-c.usado)})</option>)}</select></Campo>}
        <Campo label="Conta Bancária"><select value={form.contaId||''} onChange={e=>setForm({...form,contaId:e.target.value||null})} className={inp}><option value="">Nenhuma</option>{contas.map(c=><option key={c.id} value={c.id}>{c.bancoNome} – {c.nome}</option>)}</select></Campo>
        <Campo label="Observações"><input type="text" value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})} className={inp} placeholder="Opcional"/></Campo>
      </Modal>)}
    </div>
  );
}

// ─── PLANEJAMENTO ─────────────────────────────────────────────────────────────

function Planejamento({despesasFuturas,transactions,onAdd,onUpdate,onDelete}) {
  const [modal,setModal]=useState(false);
  const [editando,setEditando]=useState(null);
  const [expandido,setExpandido]=useState(null);
  const [form,setForm]=useState({categoria:'',valor:'',tipo:'Despesa Fixa',mes:mesAtual()});
  const proximos6=Array.from({length:6},(_,i)=>getMes(i));
  const mesHoje=mesAtual();

  function abrir(df){setForm(df?{categoria:df.categoria,valor:String(df.valor),tipo:df.tipo,mes:df.mes}:{categoria:'',valor:'',tipo:'Despesa Fixa',mes:mesAtual()});setEditando(df?df.id:null);setModal(true);}
  async function salvar(){if(!form.categoria||!form.valor)return;const df={id:editando||uid(),categoria:form.categoria,valor:money(form.valor),tipo:form.tipo,mes:form.mes};if(editando)await onUpdate(df);else await onAdd(df);setModal(false);}
  function getTotalMes(mes){if(mes<=mesHoje)return transactions.filter(t=>t.tipo!=='Receita'&&t.mes===mes).reduce((s,t)=>s+t.valor,0);return despesasFuturas.filter(df=>df.mes<=mes).reduce((s,df)=>s+df.valor,0);}

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-white">Planejamento</h1><p className="text-slate-400 text-sm">Visão dos próximos 6 meses</p></div><button onClick={()=>abrir(null)} className={btnP+' flex items-center gap-2'}><Plus size={16}/>Nova Recorrente</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {proximos6.map(mes=>{const total=getTotalMes(mes);const isAtual=mes===mesHoje;const isPast=mes<mesHoje;return(
          <div key={mes} className={'bg-slate-800 rounded-2xl p-5 shadow-sm border cursor-pointer transition-all '+(isAtual?'border-indigo-500 ring-2 ring-indigo-500/30':'border-slate-700 hover:border-slate-600')} onClick={()=>setExpandido(expandido===mes?null:mes)}>
            <div className="flex items-center justify-between mb-2"><span className="font-semibold text-slate-200">{getMesLabel(mes)}</span><div className="flex items-center gap-2">{isAtual&&<span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">Atual</span>}{isPast&&<span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">Passado</span>}{expandido===mes?<ChevronUp size={16} className="text-slate-500"/>:<ChevronDown size={16} className="text-slate-500"/>}</div></div>
            <p className={'text-xl font-bold '+(total>0?'text-red-400':'text-slate-600')}>{fmt(total)}</p>
            {expandido===mes&&<div className="mt-4 flex flex-col gap-2 border-t border-slate-700 pt-3">{(isPast||isAtual?transactions.filter(t=>t.tipo!=='Receita'&&t.mes===mes):despesasFuturas.filter(df=>df.mes<=mes)).map((item,i)=><div key={item.id||i} className="flex justify-between text-sm"><span className="text-slate-400">{item.categoria}</span><span className="font-medium text-red-400">{fmt(item.valor)}</span></div>)}</div>}
          </div>
        );})}
      </div>
      {despesasFuturas.length>0&&<div className="bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-700"><h3 className="font-semibold text-slate-200 mb-4">Despesas Recorrentes</h3><div className="flex flex-col gap-2">{despesasFuturas.map(df=><div key={df.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"><div><p className="font-medium text-slate-300 text-sm">{df.categoria}</p><p className="text-xs text-slate-500">{df.tipo} · a partir de {getMesLabel(df.mes)}</p></div><div className="flex items-center gap-2"><span className="font-semibold text-red-400 text-sm">{fmt(df.valor)}/mês</span><button onClick={()=>abrir(df)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500"><Edit size={14}/></button><button onClick={()=>onDelete(df.id)} className="p-1.5 hover:bg-red-900/30 rounded-lg text-red-400"><Trash2 size={14}/></button></div></div>)}</div></div>}
      {modal&&(<Modal titulo="📅 Despesa Recorrente" onClose={()=>setModal(false)} footer={<><button onClick={()=>setModal(false)} className={btnS+' flex-1'}>Cancelar</button><button onClick={salvar} className={btnP+' flex-1'}>Salvar</button></>}>
        <Campo label="Categoria / Nome"><input type="text" value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})} className={inp} placeholder="Ex: Aluguel, Academia..."/></Campo>
        <Campo label="Valor Mensal (R$)"><input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className={inp} placeholder="0,00"/></Campo>
        <Campo label="Tipo"><select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} className={inp}><option>Despesa Fixa</option><option>Despesa Variável</option></select></Campo>
        <Campo label="A partir de"><select value={form.mes} onChange={e=>setForm({...form,mes:e.target.value})} className={inp}>{proximos6.map(m=><option key={m} value={m}>{getMesLabel(m)}</option>)}</select></Campo>
      </Modal>)}
    </div>
  );
}

// ─── CARTÕES ──────────────────────────────────────────────────────────────────

function Cartoes({cartoes,transactions,bancos,onAddCartao,onUpdateCartao,onDeleteCartao,onAddTx,onVincular,onDesvincular}) {
  const [modalCartao,setModalCartao]=useState(false);
  const [modalCompra,setModalCompra]=useState(null);
  const [editandoCartao,setEditandoCartao]=useState(null);
  const [formCartao,setFormCartao]=useState({nome:'',limite:'',dataFechamento:'',dataVencimento:''});
  const [formCompra,setFormCompra]=useState({categoria:'',valor:'',data:today(),obs:'',parcelas:'1'});
  const [extratoAberto,setExtratoAberto]=useState(null);
  const [extratoMes,setExtratoMes]=useState(mesAtual());
  const [vinculando,setVinculando]=useState(null);
  const mesesOpts=Array.from({length:6},(_,i)=>getMes(i-5));

  function abrirCartao(c){setFormCartao(c?{nome:c.nome,limite:String(c.limite),dataFechamento:String(c.dataFechamento),dataVencimento:String(c.dataVencimento)}:{nome:'',limite:'',dataFechamento:'',dataVencimento:''});setEditandoCartao(c?c.id:null);setModalCartao(true);}
  async function salvarCartao(){if(!formCartao.nome||!formCartao.limite)return;const c={id:editandoCartao||uid(),nome:formCartao.nome,limite:money(formCartao.limite),usado:editandoCartao?(cartoes.find(x=>x.id===editandoCartao)?.usado||0):0,dataFechamento:Number(formCartao.dataFechamento)||1,dataVencimento:Number(formCartao.dataVencimento)||10};if(editandoCartao)await onUpdateCartao(c);else await onAddCartao(c);setModalCartao(false);}
  async function salvarCompra(cartaoId){
    if(!formCompra.categoria||!formCompra.valor)return;
    const valorTotal=money(formCompra.valor);const parcelas=Math.max(1,parseInt(formCompra.parcelas)||1);const vP=money(valorTotal/parcelas);
    const nomeCartao=cartoes.find(c=>c.id===cartaoId)?.nome||'';
    for(let i=0;i<parcelas;i++){const d=new Date(formCompra.data);d.setMonth(d.getMonth()+i);const ds=d.toISOString().split('T')[0];await onAddTx({id:uid()+i,tipo:'Cartão de Crédito',categoria:formCompra.categoria,valor:i===parcelas-1?money(valorTotal-vP*(parcelas-1)):vP,data:ds,pagamento:'Cartão '+nomeCartao,obs:parcelas>1?(i+1)+'/'+parcelas+(formCompra.obs?' - '+formCompra.obs:''):formCompra.obs,mes:ds.slice(0,7),cartaoId,bancoId:null,contaId:null});}
    const cartao=cartoes.find(c=>c.id===cartaoId);if(cartao)await onUpdateCartao({...cartao,usado:money(cartao.usado+valorTotal)});
    setFormCompra({categoria:'',valor:'',data:today(),obs:'',parcelas:'1'});setModalCompra(null);
  }
  function getBanco(cid){return bancos.find(b=>(b.cartoesVinculados||[]).includes(cid));}

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-white">Cartões de Crédito</h1><button onClick={()=>abrirCartao(null)} className={btnP+' flex items-center gap-2'}><Plus size={16}/>Novo Cartão</button></div>
      {cartoes.length===0&&<div className="bg-slate-800 rounded-2xl p-10 text-center text-slate-500 shadow-sm border border-slate-700">Nenhum cartão cadastrado</div>}
      {cartoes.map(c=>{
        const pct=c.limite>0?Math.min((c.usado/c.limite)*100,100):0;
        const bv=getBanco(c.id);const isE=extratoAberto===c.id;
        const txE=transactions.filter(t=>t.cartaoId===c.id&&t.mes===extratoMes).sort((a,b)=>b.data.localeCompare(a.data));
        return(
          <div key={c.id} className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 shadow-md text-white">
            <div className="flex items-start justify-between mb-4"><div><p className="text-indigo-200 text-xs mb-1">Cartão de Crédito</p><h3 className="text-xl font-bold">{c.nome}</h3></div><div className="flex gap-2"><button onClick={()=>abrirCartao(c)} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg"><Edit size={14}/></button><button onClick={()=>onDeleteCartao(c.id)} className="p-2 bg-white/20 hover:bg-red-400/50 rounded-lg"><Trash2 size={14}/></button></div></div>
            <div className="mb-3"><div className="flex justify-between text-sm mb-1.5"><span className="text-indigo-200">Usado: {fmt(c.usado)}</span><span className="text-indigo-200">Limite: {fmt(c.limite)}</span></div><div className="bg-white/20 rounded-full h-2"><div className={'h-2 rounded-full '+(pct>=100?'bg-red-400':pct>=90?'bg-yellow-400':'bg-green-400')} style={{width:pct+'%'}}/></div><p className="text-xs text-indigo-200 mt-1">{fmt(c.limite-c.usado)} disponível · Fecha dia {c.dataFechamento} · Vence dia {c.dataVencimento}</p></div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={()=>{setFormCompra({categoria:'',valor:'',data:today(),obs:'',parcelas:'1'});setModalCompra(c.id);}} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"><Plus size={13}/>Lançar Compra</button>
              <button onClick={()=>setExtratoAberto(isE?null:c.id)} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"><FileText size={13}/>{isE?'Fechar':'Ver Extrato'}</button>
              <select value={bv?.id||''} onChange={e=>{const bid=e.target.value;if(bid)setVinculando({cartaoId:c.id,bancoId:bid});else onDesvincular(c.id);}} className="bg-white/20 text-white text-xs px-2 py-1.5 rounded-lg border-0 focus:outline-none"><option value="" style={{color:'#1f2937'}}>Sem banco vinculado</option>{bancos.map(b=><option key={b.id} value={b.id} style={{color:'#1f2937'}}>{b.nome}</option>)}</select>
            </div>
            {isE&&<div className="mt-4 bg-white/10 rounded-xl p-4"><div className="flex items-center justify-between mb-3"><p className="font-semibold text-sm">Extrato</p><select value={extratoMes} onChange={e=>setExtratoMes(e.target.value)} className="bg-white/20 text-white text-xs px-2 py-1 rounded-lg border-0 focus:outline-none">{mesesOpts.map(m=><option key={m} value={m} style={{color:'#1f2937'}}>{getMesLabel(m)}</option>)}</select></div>{txE.length===0?<p className="text-xs text-indigo-200 text-center py-2">Nenhuma compra</p>:<><div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">{txE.map(t=><div key={t.id} className="flex justify-between text-xs"><span className="text-indigo-100">{t.data.split('-').reverse().join('/')} · {t.categoria}{t.obs?' ('+t.obs+')':''}</span><span className="font-medium">{fmt(t.valor)}</span></div>)}</div><div className="flex justify-between font-semibold text-sm mt-2 pt-2 border-t border-white/20"><span>Total</span><span>{fmt(txE.reduce((s,t)=>s+t.valor,0))}</span></div></>}</div>}
          </div>
        );
      })}
      {modalCartao&&<Modal titulo={editandoCartao?'Editar Cartão':'Novo Cartão'} onClose={()=>setModalCartao(false)} footer={<><button onClick={()=>setModalCartao(false)} className={btnS+' flex-1'}>Cancelar</button><button onClick={salvarCartao} className={btnP+' flex-1'}>Salvar</button></>}><Campo label="Nome"><input type="text" value={formCartao.nome} onChange={e=>setFormCartao({...formCartao,nome:e.target.value})} className={inp} placeholder="Ex: Nubank, Itaú..."/></Campo><Campo label="Limite (R$)"><input type="number" step="0.01" min="0" value={formCartao.limite} onChange={e=>setFormCartao({...formCartao,limite:e.target.value})} className={inp} placeholder="0,00"/></Campo><Campo label="Dia Fechamento"><input type="number" min="1" max="31" value={formCartao.dataFechamento} onChange={e=>setFormCartao({...formCartao,dataFechamento:e.target.value})} className={inp} placeholder="Ex: 25"/></Campo><Campo label="Dia Vencimento"><input type="number" min="1" max="31" value={formCartao.dataVencimento} onChange={e=>setFormCartao({...formCartao,dataVencimento:e.target.value})} className={inp} placeholder="Ex: 5"/></Campo></Modal>}
      {modalCompra&&<Modal titulo={'Lançar Compra — '+(cartoes.find(c=>c.id===modalCompra)?.nome||'')} onClose={()=>setModalCompra(null)} footer={<><button onClick={()=>setModalCompra(null)} className={btnS+' flex-1'}>Cancelar</button><button onClick={()=>salvarCompra(modalCompra)} className={btnP+' flex-1'}>Lançar</button></>}><Campo label="Categoria"><select value={formCompra.categoria} onChange={e=>setFormCompra({...formCompra,categoria:e.target.value})} className={inp}><option value="">Selecione...</option>{CATEGORIAS['Cartão de Crédito'].map(c=><option key={c}>{c}</option>)}</select></Campo><Campo label="Valor Total (R$)"><input type="number" step="0.01" min="0" value={formCompra.valor} onChange={e=>setFormCompra({...formCompra,valor:e.target.value})} className={inp} placeholder="0,00"/></Campo><Campo label="Data"><input type="date" value={formCompra.data} onChange={e=>setFormCompra({...formCompra,data:e.target.value})} className={inp}/></Campo><Campo label="Parcelas"><select value={formCompra.parcelas} onChange={e=>setFormCompra({...formCompra,parcelas:e.target.value})} className={inp}>{Array.from({length:12},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}x{formCompra.valor?' de '+fmt(money(formCompra.valor)/n):''}</option>)}</select></Campo><Campo label="Observações"><input type="text" value={formCompra.obs} onChange={e=>setFormCompra({...formCompra,obs:e.target.value})} className={inp} placeholder="Opcional"/></Campo></Modal>}
      {vinculando&&<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"><div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-700"><h3 className="font-bold text-white mb-2">Confirmar vinculação</h3><p className="text-slate-400 text-sm mb-4">Vincular <strong className="text-slate-200">{cartoes.find(c=>c.id===vinculando.cartaoId)?.nome}</strong> ao banco <strong className="text-slate-200">{bancos.find(b=>b.id===vinculando.bancoId)?.nome}</strong>?</p><div className="flex gap-3"><button onClick={()=>setVinculando(null)} className={btnS+' flex-1'}>Cancelar</button><button onClick={()=>{onVincular(vinculando.cartaoId,vinculando.bancoId);setVinculando(null);}} className={btnP+' flex-1'}>Confirmar</button></div></div></div>}
    </div>
  );
}

// ─── BANCOS ───────────────────────────────────────────────────────────────────

function Bancos({bancos,transactions,onAddBanco,onDeleteBanco,onAddConta,onDeleteConta}) {
  const [modalBanco,setModalBanco]=useState(false);
  const [modalConta,setModalConta]=useState(null);
  const [formBanco,setFormBanco]=useState({nome:'',cor:'#6366f1'});
  const [formConta,setFormConta]=useState({tipo:'Corrente',nome:'',saldoInicial:''});
  const [extratoAberto,setExtratoAberto]=useState(null);
  const [filtro,setFiltro]=useState({mes:'',ano:''});

  async function adicionarBanco(){if(!formBanco.nome)return;await onAddBanco({id:uid(),nome:formBanco.nome,cor:formBanco.cor,contas:[],cartoesVinculados:[]});setFormBanco({nome:'',cor:'#6366f1'});setModalBanco(false);}
  async function adicionarConta(bancoId){if(formConta.saldoInicial==='')return;const conta={id:uid(),tipo:formConta.tipo,nome:formConta.tipo==='Personalizada'?formConta.nome:formConta.tipo,saldoInicial:money(formConta.saldoInicial),criadaEm:today()};await onAddConta(bancoId,conta);setFormConta({tipo:'Corrente',nome:'',saldoInicial:''});setModalConta(null);}
  function getSaldo(conta){const tx=transactions.filter(t=>t.contaId===conta.id);return money(conta.saldoInicial+tx.filter(t=>t.tipo==='Receita').reduce((s,t)=>s+t.valor,0)-tx.filter(t=>t.tipo!=='Receita').reduce((s,t)=>s+t.valor,0));}
  function getTxF(contaId){let tx=transactions.filter(t=>t.contaId===contaId);if(filtro.mes)tx=tx.filter(t=>t.mes?.slice(5,7)===filtro.mes);if(filtro.ano)tx=tx.filter(t=>t.mes?.slice(0,4)===filtro.ano);return tx.sort((a,b)=>b.data.localeCompare(a.data));}

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-white">Bancos e Contas</h1><button onClick={()=>setModalBanco(true)} className={btnP+' flex items-center gap-2'}><Plus size={16}/>Novo Banco</button></div>
      {bancos.length===0&&<div className="bg-slate-800 rounded-2xl p-10 text-center text-slate-500 shadow-sm border border-slate-700">Nenhum banco cadastrado</div>}
      {bancos.map(b=>{
        const totalBanco=(b.contas||[]).reduce((s,c)=>s+getSaldo(c),0);
        return(
          <div key={b.id} className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between p-5" style={{borderLeft:'4px solid '+b.cor}}>
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor:b.cor+'30'}}><Building2 size={20} style={{color:b.cor}}/></div><div><h3 className="font-bold text-white">{b.nome}</h3><p className="text-sm text-slate-400">{(b.contas||[]).length} conta(s) · Saldo: <span className={totalBanco>=0?'font-semibold text-green-400':'font-semibold text-red-400'}>{fmt(totalBanco)}</span></p></div></div>
              <div className="flex gap-2"><button onClick={()=>{setFormConta({tipo:'Corrente',nome:'',saldoInicial:''});setModalConta(b.id);}} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 text-xs flex items-center gap-1"><Plus size={14}/>Conta</button><button onClick={()=>onDeleteBanco(b.id)} className="p-2 hover:bg-red-900/30 rounded-lg text-red-400"><Trash2 size={15}/></button></div>
            </div>
            {(b.contas||[]).map(c=>{
              const saldo=getSaldo(c);const isE=extratoAberto===c.id;const txF=getTxF(c.id);
              const entradas=txF.filter(t=>t.tipo==='Receita').reduce((s,t)=>s+t.valor,0);
              const saidas=txF.filter(t=>t.tipo!=='Receita').reduce((s,t)=>s+t.valor,0);
              const ti=TIPOS_CONTA.find(t=>t.tipo===c.tipo)||TIPOS_CONTA[5];
              return(
                <div key={c.id} className="border-t border-slate-700">
                  <div className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2.5"><span className="text-lg">{ti.label.split(' ')[0]}</span><div><p className="font-medium text-slate-200 text-sm">{c.nome}</p><p className="text-xs text-slate-500">Saldo inicial: {fmt(c.saldoInicial)}</p></div></div>
                    <div className="flex items-center gap-3"><span className={'font-bold text-sm '+(saldo>=0?'text-green-400':'text-red-400')}>{fmt(saldo)}</span><button onClick={()=>{setExtratoAberto(isE?null:c.id);setFiltro({mes:'',ano:''});}} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"><FileText size={13}/>{isE?'Fechar':'Extrato'}</button><button onClick={()=>onDeleteConta(b.id,c.id)} className="p-1 hover:bg-red-900/30 rounded text-red-400"><Trash2 size={13}/></button></div>
                  </div>
                  {isE&&<div className="mx-5 mb-4 bg-slate-900 rounded-xl p-4"><div className="flex items-center gap-3 mb-3 flex-wrap"><p className="font-semibold text-sm text-slate-200">Extrato</p><select value={filtro.mes} onChange={e=>setFiltro(f=>({...f,mes:e.target.value}))} className={inp+' !py-1.5 w-auto text-xs'}><option value="">Todos os meses</option>{MESES.map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select><select value={filtro.ano} onChange={e=>setFiltro(f=>({...f,ano:e.target.value}))} className={inp+' !py-1.5 w-auto text-xs'}><option value="">Todos os anos</option>{['2024','2025','2026'].map(a=><option key={a}>{a}</option>)}</select>{(filtro.mes||filtro.ano)&&<button onClick={()=>setFiltro({mes:'',ano:''})} className="text-xs text-slate-500 hover:text-slate-300">Limpar</button>}</div><div className="grid grid-cols-3 gap-2 mb-3"><div className="bg-slate-800 rounded-lg p-2.5 text-center"><p className="text-xs text-slate-500">Saldo Inicial</p><p className="font-semibold text-sm text-slate-300">{fmt(c.saldoInicial)}</p></div><div className="bg-slate-800 rounded-lg p-2.5 text-center"><p className="text-xs text-slate-500">Entradas</p><p className="font-semibold text-sm text-green-400">{fmt(entradas)}</p></div><div className="bg-slate-800 rounded-lg p-2.5 text-center"><p className="text-xs text-slate-500">Saídas</p><p className="font-semibold text-sm text-red-400">{fmt(saidas)}</p></div></div>{txF.length===0?<p className="text-xs text-slate-500 text-center py-3">Nenhuma movimentação</p>:<div className="flex flex-col max-h-52 overflow-y-auto">{txF.map(t=><div key={t.id} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-700 last:border-0"><div><span className={t.tipo==='Receita'?'font-medium text-green-400':'font-medium text-red-400'}>{t.tipo==='Receita'?'+':'-'}</span><span className="text-slate-400 ml-1">{t.categoria}</span><span className="text-slate-600 ml-1">· {t.data.split('-').reverse().join('/')}</span></div><span className={t.tipo==='Receita'?'font-semibold text-green-400':'font-semibold text-red-400'}>{fmt(t.valor)}</span></div>)}</div>}</div>}
                </div>
              );
            })}
          </div>
        );
      })}
      {modalBanco&&<Modal titulo="Novo Banco" onClose={()=>setModalBanco(false)} footer={<><button onClick={()=>setModalBanco(false)} className={btnS+' flex-1'}>Cancelar</button><button onClick={adicionarBanco} className={btnP+' flex-1'}>Adicionar</button></>}><Campo label="Nome do Banco"><input type="text" value={formBanco.nome} onChange={e=>setFormBanco({...formBanco,nome:e.target.value})} className={inp} placeholder="Ex: Nubank, Itaú..."/></Campo><Campo label="Cor"><div className="flex items-center gap-3"><input type="color" value={formBanco.cor} onChange={e=>setFormBanco({...formBanco,cor:e.target.value})} className="w-12 h-10 rounded-lg cursor-pointer border border-gray-200"/><span className="text-sm text-gray-500">{formBanco.cor}</span></div></Campo></Modal>}
      {modalConta&&<Modal titulo={'Nova Conta — '+(bancos.find(b=>b.id===modalConta)?.nome||'')} onClose={()=>setModalConta(null)} footer={<><button onClick={()=>setModalConta(null)} className={btnS+' flex-1'}>Cancelar</button><button onClick={()=>adicionarConta(modalConta)} className={btnP+' flex-1'}>Adicionar</button></>}><Campo label="Tipo"><select value={formConta.tipo} onChange={e=>setFormConta({...formConta,tipo:e.target.value})} className={inp}>{TIPOS_CONTA.map(t=><option key={t.tipo} value={t.tipo}>{t.label}</option>)}</select></Campo>{formConta.tipo==='Personalizada'&&<Campo label="Nome da Conta"><input type="text" value={formConta.nome} onChange={e=>setFormConta({...formConta,nome:e.target.value})} className={inp} placeholder="Ex: Viagem, Reserva..."/></Campo>}<Campo label="Saldo Inicial (R$)"><input type="number" step="0.01" value={formConta.saldoInicial} onChange={e=>setFormConta({...formConta,saldoInicial:e.target.value})} className={inp} placeholder="0,00"/></Campo></Modal>}
    </div>
  );
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────

function Configuracoes({metas,onSave,userId}) {
  const [form,setForm]=useState({gastoMensal:String(metas.gastoMensal||''),limiteCartao:String(metas.limiteCartao||'')});
  const [salvo,setSalvo]=useState(false);
  async function salvar(){await onSave({gastoMensal:money(form.gastoMensal),limiteCartao:money(form.limiteCartao)});setSalvo(true);setTimeout(()=>setSalvo(false),2000);}

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-bold text-white">Configurações</h1>
      <div className="bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-700"><h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2"><Target size={16}/>Metas Mensais</h3><div className="flex flex-col gap-4"><Campo label="Meta de Gasto Mensal (R$)"><input type="number" step="0.01" min="0" value={form.gastoMensal} onChange={e=>setForm({...form,gastoMensal:e.target.value})} className={inp} placeholder="Ex: 5000"/></Campo><Campo label="Meta de Uso de Cartões (R$)"><input type="number" step="0.01" min="0" value={form.limiteCartao} onChange={e=>setForm({...form,limiteCartao:e.target.value})} className={inp} placeholder="Ex: 2000"/></Campo><button onClick={salvar} className={btnP+' flex items-center gap-2 w-fit'+(salvo?' !bg-green-600':'')}>{salvo?<><CheckCircle size={16}/>Salvo!</>:'Salvar Metas'}</button></div></div>
      <div className="bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-700"><p className="text-xs text-slate-500 mb-1">Usuário</p><p className="text-sm font-medium text-slate-300 break-all">{userId}</p></div>
      <div className="bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-700"><h3 className="font-semibold text-red-400 mb-2 flex items-center gap-2"><AlertTriangle size={16}/>Zona de Perigo</h3><p className="text-sm text-slate-500 mb-4">Encerra a sessão e volta para o login.</p><button onClick={()=>supabase.auth.signOut()} className="bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><LogOut size={15}/>Sair da conta</button></div>
    </div>
  );
}
