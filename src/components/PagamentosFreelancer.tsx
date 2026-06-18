import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Wallet, Package, DollarSign, Loader2 
} from 'lucide-react';

export function PagamentosFreelancer() {
  const [loading, setLoading] = useState(false);
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [selectedFree, setSelectedFree] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [extrato, setExtrato] = useState<any[]>([]);
  const [totalGeral, setTotalGeral] = useState(0);

  useEffect(() => {
    fetchFreelancers();
  }, []);

  async function fetchFreelancers() {
    const { data } = await supabase.from('freelancers')
      .select('id, nome')
      .neq('status', 'banido')
      .order('nome');
    if (data) setFreelancers(data);
  }

  async function calcularPagamento() {
    if (!selectedFree || !dataInicio || !dataFim) {
      alert("Por favor, selecione o freelancer e o período de datas.");
      return;
    }

    setLoading(true);
    setExtrato([]);

    try {
      // 1. Buscar ordens finalizadas no intervalo de datas
      const { data: ordens, error: errorOrdens } = await supabase
        .from('ordens_producao')
        .select('id')
        .eq('freelancer_id', selectedFree)
        .eq('status', 'finalizado')
        .gte('data_retorno', `${dataInicio}T00:00:00`)
        .lte('data_retorno', `${dataFim}T23:59:59`);

      if (errorOrdens) throw errorOrdens;

      if (!ordens || ordens.length === 0) {
        alert("Nenhuma ordem finalizada encontrada para este período.");
        setLoading(false);
        return;
      }

      const ordensIds = ordens.map(o => o.id);

      // 2. Buscar itens e incluir o JOIN com a tabela de produtos para pegar o nome caso o nome_do_item esteja vazio
      const { data: itens, error: errorItens } = await supabase
        .from('itens_ordem')
        .select(`
          qtd_devolvida_ok, 
          valor_unitario_na_epoca, 
          nome_do_item, 
          produto_id,
          produtos (nome)
        `)
        .in('ordem_id', ordensIds);

      if (errorItens) throw errorItens;

      // 3. Processar e Agrupar Dados
      const agrupado: any = {};
      
      itens?.forEach(item => {
        // Lógica de Nome: 1º nome_do_item da tabela, 2º nome vindo do JOIN de produtos, 3º ID como último recurso
        const nomeRelatorio = item.nome_do_item || (item.produtos as any)?.nome || item.produto_id || 'Item s/ Nome';
        
        const qtd = Number(item.qtd_devolvida_ok) || 0;
        const valor = Number(item.valor_unitario_na_epoca) || 0;

        if (qtd > 0) {
          if (!agrupado[nomeRelatorio]) {
            agrupado[nomeRelatorio] = { quantidade: 0, valorUn: valor, subtotal: 0 };
          }
          agrupado[nomeRelatorio].quantidade += qtd;
          agrupado[nomeRelatorio].subtotal += (qtd * valor);
        }
      });

      const listaFinal = Object.entries(agrupado).map(([nome, dados]: any) => ({
        nome,
        ...dados
      }));

      setExtrato(listaFinal);
      setTotalGeral(listaFinal.reduce((acc, curr) => acc + curr.subtotal, 0));

    } catch (err: any) {
      console.error("Erro no cálculo:", err);
      alert("Erro ao processar: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <header>
        <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-3">
          <Wallet className="text-green-600" size={32} /> Pagamentos
        </h2>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Relatório de produção conferida</p>
      </header>

      {/* FILTROS */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Freelancer</label>
          <select 
            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-green-200 cursor-pointer"
            value={selectedFree}
            onChange={(e) => setSelectedFree(e.target.value)}
          >
            <option value="">Selecione...</option>
            {freelancers.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Início</label>
          <input type="date" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-green-200"
            value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Fim</label>
          <input type="date" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-green-200"
            value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>

        <button onClick={calcularPagamento} disabled={loading}
          className="w-full bg-gray-900 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" size={18} /> : "Calcular"}
        </button>
      </div>

      {/* RESULTADOS */}
      {extrato.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
          <div className="md:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center gap-2">
              <Package size={20} className="text-gray-400"/>
              <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest">Produção Conferida</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                  <th className="px-8 py-4">Item / Categoria</th>
                  <th className="px-8 py-4 text-center">Quantidade</th>
                  <th className="px-8 py-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {extrato.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-4">
                      <p className="font-bold text-gray-700 uppercase text-xs">{item.nome}</p>
                      <p className="text-[9px] text-gray-400 font-bold tracking-tighter">UNITÁRIO: R$ {item.valorUn.toFixed(2)}</p>
                    </td>
                    <td className="px-8 py-4 text-center font-black text-gray-600">{item.quantidade}</td>
                    <td className="px-8 py-4 text-right font-black text-green-600">R$ {item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-green-600 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col justify-between h-full relative overflow-hidden">
            <DollarSign size={100} className="absolute -right-4 -bottom-4 opacity-10" />
            <div>
              <p className="text-green-100 font-black uppercase text-[10px] tracking-widest mb-1">Total a Pagar</p>
              <h4 className="text-4xl font-black tracking-tighter">R$ {totalGeral.toFixed(2)}</h4>
            </div>
            <div className="mt-8 pt-4 border-t border-white/20 text-[10px] font-bold uppercase opacity-80">
              Total de {extrato.reduce((a, b) => a + b.quantidade, 0)} unidades produzidas
            </div>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="bg-white p-20 rounded-[3rem] border border-dashed border-gray-200 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">
            Defina os filtros para gerar o fechamento
          </div>
        )
      )}
    </div>
  );
}