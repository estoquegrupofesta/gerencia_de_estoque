import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  BarChart3, TrendingUp, Package, Calendar, Activity, 
  RefreshCcw, XCircle, Search, ChevronDown, ChevronUp, CalendarDays 
} from 'lucide-react';

// Interface para os indicadores
interface Resumo {
  naRua: number;
  enviado3Dias: number;
  enviado7Dias: number;
  mediaDiaria30Dias: number;
  mediaSemanal: number;
}

export function HistoricoProducao() {
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<Resumo>({
    naRua: 0, enviado3Dias: 0, enviado7Dias: 0, mediaDiaria30Dias: 0, mediaSemanal: 0
  });
  const [recentes, setRecentes] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);
  const [filtroCalendario, setFiltroCalendario] = useState<string>('');
  const [pesquisa, setPesquisa] = useState('');
  const [datasAbertas, setDatasAbertas] = useState<string[]>([]);

  useEffect(() => {
    calcularIndicadores();
  }, []);

  async function calcularIndicadores() {
    setLoading(true);
    const hoje = new Date();

    const { data: itensGerais } = await supabase
      .from('itens_ordem')
      .select('qtd_entregue, qtd_devolvida_ok, ordens_producao!inner(status, data_retorno)');

    if (itensGerais) {
      const naRua = itensGerais.filter((i: any) => i.ordens_producao.status === 'pendente')
                               .reduce((acc, i) => acc + (i.qtd_entregue || 0), 0);
      
      const calcTotal = (dias: number) => {
        const dataCorte = new Date(new Date().setDate(hoje.getDate() - dias)).toISOString();
        return itensGerais
          .filter((i: any) => i.ordens_producao.status === 'finalizado' && i.ordens_producao.data_retorno >= dataCorte)
          .reduce((acc, item) => acc + (item.qtd_devolvida_ok || 0), 0);
      };

      setResumo({
        naRua,
        enviado3Dias: calcTotal(3),
        enviado7Dias: calcTotal(7),
        mediaDiaria30Dias: Math.round(calcTotal(30) / 30),
        mediaSemanal: calcTotal(7)
      });
    }

    const { data: movRecentes } = await supabase
      .from('ordens_producao')
      .select(`id, status, data_saida, data_retorno, data_montagem, freelancers ( nome ), itens_ordem ( qtd_entregue, qtd_devolvida_ok )`)
      .order('id', { ascending: false })
      .limit(500);

    setRecentes(movRecentes || []);
    setLoading(false);
  }

  // 1. Lógica de Filtros Combinados
  const dadosFiltrados = recentes.filter(m => {
    const correspondeStatus = filtroStatus ? m.status === filtroStatus : true;
    const correspondePesquisa = m.freelancers?.nome?.toLowerCase().includes(pesquisa.toLowerCase());
    
    let correspondeData = true;
    if (filtroCalendario) {
      // Criamos a data a partir da string do banco (dataItem)
      const dataBruta = m.data_retorno || m.data_saida || m.data_montagem;
      
      // Ajuste de Fuso Horário: 
      // Convertemos a data do banco para uma string local YYYY-MM-DD
      const d = new Date(dataBruta);
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      const dataLocalFormatada = `${ano}-${mes}-${dia}`;

      correspondeData = dataLocalFormatada === filtroCalendario;
    }
    
    return correspondeStatus && correspondePesquisa && correspondeData;
  });

  // 2. Lógica de Agrupamento com Ordem Decrescente
  const agruparPorData = (dados: any[]) => {
    const grupos: { [key: string]: any[] } = {};
    const dadosOrdenados = [...dados].sort((a, b) => {
      const dateA = new Date(a.data_retorno || a.data_saida || a.data_montagem).getTime();
      const dateB = new Date(b.data_retorno || b.data_saida || b.data_montagem).getTime();
      return dateB - dateA; // Recentes primeiro
    });

    dadosOrdenados.forEach(item => {
      const dataStr = new Date(item.data_retorno || item.data_saida || item.data_montagem).toLocaleDateString('pt-BR');
      if (!grupos[dataStr]) grupos[dataStr] = [];
      grupos[dataStr].push(item);
    });
    return grupos;
  };

  const toggleData = (data: string) => {
    setDatasAbertas(prev => prev.includes(data) ? prev.filter(d => d !== data) : [...prev, data]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-3">
            <BarChart3 className="text-purple-600" size={32} /> Histórico Inteligente
          </h2>
          <p className="text-gray-500 font-medium font-sans">Controle de fluxo e produtividade.</p>
        </div>
        <button 
          onClick={calcularIndicadores} 
          className="p-4 bg-white border border-gray-100 rounded-2xl hover:text-purple-600 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* CARDS INDICADORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardStat title="Em Produção" value={resumo.naRua} icon={<Package />} color="bg-orange-500" />
        <CardStat title="Finalizado 3d" value={resumo.enviado3Dias} icon={<TrendingUp />} color="bg-green-500" />
        <CardStat title="Média Dia" value={resumo.mediaDiaria30Dias} icon={<Activity />} color="bg-blue-500" />
        <CardStat title="Semanal" value={resumo.mediaSemanal} icon={<Calendar />} color="bg-purple-500" />
      </div>

      {/* PAINEL DE BUSCA E FILTROS */}
      <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar freelancer..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm outline-none font-bold cursor-text"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
            />
          </div>
          
          <div className="relative min-w-[200px]">
            <button 
              type="button"
              onClick={(e) => {
                const input = e.currentTarget.querySelector('input') as HTMLInputElement & { showPicker?: () => void };
                if (input && typeof input.showPicker === 'function') input.showPicker();
                else input?.click();
              }}
              className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 px-4 py-3 rounded-xl transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 pointer-events-none">
                <CalendarDays className="text-purple-500" size={18} />
                <span className="text-[10px] font-black uppercase text-gray-500">
                  {filtroCalendario ? new Date(filtroCalendario).toLocaleDateString('pt-BR') : 'Filtrar Data'}
                </span>
              </div>
              <input 
                type="date" 
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={filtroCalendario}
                onChange={(e) => setFiltroCalendario(e.target.value)}
              />
              <ChevronDown size={16} className="text-gray-400 pointer-events-none" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-50">
          <FilterBtn active={filtroStatus === 'pendente'} onClick={() => setFiltroStatus('pendente')} label="pendente" color="orange" />
          <FilterBtn active={filtroStatus === 'montado'} onClick={() => setFiltroStatus('montado')} label="montado" color="blue" />
          <FilterBtn active={filtroStatus === 'finalizado'} onClick={() => setFiltroStatus('finalizado')} label="finalizado" color="green" />
          
          {(filtroStatus || filtroCalendario || pesquisa) && (
            <button 
              onClick={() => { setFiltroStatus(null); setFiltroCalendario(''); setPesquisa(''); }} 
              className="ml-auto text-[10px] font-black uppercase text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-all"
            >
              <XCircle size={14}/> Limpar Tudo
            </button>
          )}
        </div>
      </div>

      {/* EXIBIÇÃO DOS DADOS */}
      <div className="space-y-3">
        {filtroStatus === 'finalizado' ? (
          Object.entries(agruparPorData(dadosFiltrados)).map(([data, itens]) => (
            <div key={data} className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => toggleData(data)}
                className="w-full px-8 py-5 flex justify-between items-center bg-gray-50/50 hover:bg-gray-100 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center font-black text-xs">
                    {itens.length}
                  </div>
                  <span className="font-black text-gray-700 uppercase tracking-widest text-sm">{data}</span>
                </div>
                {datasAbertas.includes(data) ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </button>
              {datasAbertas.includes(data) && (
                <div className="p-2 border-t border-gray-50">
                  <TableRender dados={itens} />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <TableRender dados={dadosFiltrados} />
          </div>
        )}
      </div>
    </div>
  );
}

// COMPONENTES AUXILIARES
function FilterBtn({ active, onClick, label, color }: any) {
  const colors: any = {
    orange: active ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600',
    blue: active ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600',
    green: active ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600',
  };
  return (
    <button onClick={onClick} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all active:scale-95 ${colors[color]}`}>
      {label}
    </button>
  );
}

function TableRender({ dados }: { dados: any[] }) {
  if (dados.length === 0) return <div className="p-16 text-center text-gray-300 font-black uppercase text-xs">Nenhum registro</div>;
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
          <th className="px-8 py-4">Freelancer</th>
          <th className="px-8 py-4">Status</th>
          <th className="px-8 py-4 text-right">Volume</th>
          <th className="px-8 py-4 text-right">Data</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {dados.map((m) => (
          <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
            <td className="px-8 py-4 font-bold text-gray-700 uppercase text-xs">{m.freelancers?.nome}</td>
            <td className="px-8 py-4">
               <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${m.status === 'finalizado' ? 'bg-green-100 text-green-600' : m.status === 'pendente' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                {m.status}
              </span>
            </td>
            <td className="px-8 py-4 text-right font-black text-gray-600 text-xs">
              {m.status === 'finalizado' ? `${m.itens_ordem.reduce((a:any, b:any) => a + (b.qtd_devolvida_ok || 0), 0)} un` : `${m.itens_ordem.reduce((a:any, b:any) => a + (b.qtd_entregue || 0), 0)} un`}
            </td>
            <td className="px-8 py-4 text-right font-bold text-gray-400 text-[10px]">
              {new Date(m.data_retorno || m.data_saida || m.data_montagem).toLocaleDateString('pt-BR')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CardStat({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-5 rounded-[1.8rem] border border-gray-100 flex items-center gap-4">
      <div className={`w-12 h-12 ${color} text-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-100`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
        <p className="text-xl font-black text-gray-800">{value.toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}