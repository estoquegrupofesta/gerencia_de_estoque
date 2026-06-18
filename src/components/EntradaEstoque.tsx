import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Search, 
  Layers, 
  Database,
  Plus,
  Minus,
  CheckCircle2,
  Package,
  LayoutGrid,
  MapPin,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

interface ItemEstoque {
  id: string;
  nome: string;
  sku?: string;
  tipo: 'produto' | 'insumo';
  estoque_producao?: number;
  estoque_unitarizado?: number;
  estoque_atual?: number; 
  qtd_padrao?: number;
  unidade_medida?: string;
  local_id?: string;
  locais?: { nome: string };
}

export function EntradaEstoque() {
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [selecionado, setSelecionado] = useState<ItemEstoque | null>(null);
  const [busca, setBusca] = useState('');
  
  // Focado apenas em Somar/Subtrair
  const [tipoOperacao, setTipoOperacao] = useState<'adicionar' | 'remover'>('adicionar');
  const [localEstoque, setLocalEstoque] = useState<'estoque_producao' | 'estoque_unitarizado' | 'insumos'>('estoque_producao');
  
  const [showManualQty, setShowManualQty] = useState(false);
  const [qtdLote, setQtdLote] = useState<number>(50);
  const [qtdCustom, setQtdCustom] = useState<string>('');
  const [numPacotes, setNumPacotes] = useState<number>('' as any);
  const [loading, setLoading] = useState(false);

  const unidadesPredefinidas = [100, 50, 25, 10, 5];
  const unidadesPorPacote = showManualQty 
    ? (qtdCustom !== '' ? Number(qtdCustom) : qtdLote) 
    : (selecionado?.qtd_padrao || 1);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    const { data: p } = await supabase.from('produtos').select('*, locais(nome)');
    const { data: i } = await supabase.from('insumos').select('*, locais(nome)');

    const listaUnificada: ItemEstoque[] = [
      ...(p?.map(item => ({ ...item, tipo: 'produto' as const })) || []),
      ...(i?.map(item => ({ ...item, tipo: 'insumo' as const })) || [])
    ];

    setItens(listaUnificada);
    setLoading(false);
  }

  async function processarMovimentacao(e: React.FormEvent) {
    e.preventDefault();
    if (!selecionado) return;

    setLoading(true);
    const tabela = selecionado.tipo === 'insumo' ? 'insumos' : 'produtos';

    try {
      const totalMovimentar = numPacotes * unidadesPorPacote;
      // Define qual coluna será alterada
      const coluna = selecionado.tipo === 'insumo' ? 'estoque_atual' : localEstoque;
      
      // @ts-ignore
      const saldoAtual = selecionado[coluna] || 0;

      if (numPacotes <= 0) throw new Error("Informe uma quantidade válida");
      
      const novoSaldo = tipoOperacao === 'adicionar' 
        ? saldoAtual + totalMovimentar 
        : saldoAtual - totalMovimentar;

      if (novoSaldo < 0) throw new Error("Saldo insuficiente para esta saída!");

      const { error } = await supabase
        .from(tabela)
        .update({ [coluna]: novoSaldo })
        .eq('id', selecionado.id);

      if (error) throw error;

      alert(`✅ Sucesso! Novo saldo em ${coluna.replace('estoque_', '')}: ${novoSaldo}`);

      // Reset básico
      setNumPacotes(1);
      setSelecionado(null);
      setBusca('');
      carregarDados();
    } catch (error: any) {
      alert("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 p-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-3">
            <TrendingUp className="text-green-600" size={32} /> Ajuste de Saldos
          </h2>
          <p className="text-gray-500 font-medium italic text-sm">Entradas e Saídas rápidas por volume.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LADO ESQUERDO: SELEÇÃO E DESTINO */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            {/* BUSCA */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Search size={14} /> 1. Localizar Item
              </label>
              <input 
                type="text"
                placeholder="Pesquisar produto ou insumo..."
                className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-500 transition-all"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
              
              {busca.length > 0 && !selecionado && (
                <div className="absolute z-20 w-[calc(100%-3rem)] md:w-[350px] border border-gray-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto shadow-2xl bg-white mt-1">
                  {itens.filter(i => i.nome.toLowerCase().includes(busca.toLowerCase())).map(item => (
                    <button 
                      key={item.id}
                      onClick={() => { 
                        setSelecionado(item); 
                        setBusca('');
                        if(item.tipo === 'insumo') setLocalEstoque('insumos');
                        else setLocalEstoque('estoque_producao');
                      }}
                      className="w-full p-4 text-left hover:bg-blue-50 border-b border-gray-50 flex justify-between items-center transition-colors"
                    >
                      <div>
                        <span className="font-bold text-gray-700 text-sm uppercase">{item.nome}</span>
                        <p className="text-[9px] font-black text-blue-400 uppercase">{item.tipo}</p>
                      </div>
                      <span className="text-[10px] bg-gray-100 px-2 py-1 rounded font-black text-gray-400">
                        {item.sku || 'INSUMO'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SELEÇÃO DE ESTADO (COLUNA) */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Database size={14} /> 2. Onde Ajustar?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  disabled={selecionado?.tipo === 'insumo'}
                  onClick={() => setLocalEstoque('estoque_producao')}
                  className={`p-3 rounded-2xl font-bold text-[10px] flex flex-col cursor-pointer items-center gap-2 border-2 transition-all disabled:opacity-20 ${localEstoque === 'estoque_producao' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-50 bg-gray-50 text-gray-400'}`}
                >
                  <Package size={16} /> Matéria-Prima
                </button>
                <button 
                  disabled={selecionado?.tipo === 'insumo'}
                  onClick={() => setLocalEstoque('estoque_unitarizado')}
                  className={`p-3 rounded-2xl font-bold text-[10px] flex flex-col cursor-pointer items-center gap-2 border-2 transition-all disabled:opacity-20 ${localEstoque === 'estoque_unitarizado' ? 'border-purple-600 bg-purple-50 text-purple-600' : 'border-gray-50 bg-gray-50 text-gray-400'}`}
                >
                  <CheckCircle2 size={16} /> Unitarizado
                </button>
                <button 
                  onClick={() => setLocalEstoque('insumos')}
                  className={`p-3 rounded-2xl font-bold text-[10px] flex flex-col cursor-pointer items-center gap-2 border-2 transition-all ${localEstoque === 'insumos' ? 'border-orange-600 bg-orange-50 text-orange-600' : 'border-gray-50 bg-gray-50 text-gray-400'}`}
                >
                  <LayoutGrid size={16} /> Insumos
                </button>
              </div>
            </div>

            {/* TIPO DE OPERAÇÃO */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setTipoOperacao('adicionar')} className={`p-4 rounded-2xl cursor-pointer font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${tipoOperacao === 'adicionar' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>
                <Plus size={18} /> Entrada
              </button>
              <button onClick={() => setTipoOperacao('remover')} className={`p-4 rounded-2xl cursor-pointer font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${tipoOperacao === 'remover' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>
                <Minus size={18} /> Saída
              </button>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: QUANTIDADE E CONFIRMAÇÃO */}
        <div className="lg:col-span-7">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8 min-h-[450px] flex flex-col">
            {selecionado ? (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-8 flex-1 flex flex-col justify-between">
                
                {/* INFO DO ITEM SELECIONADO */}
                <div className="flex justify-between items-center bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Item Ativo</p>
                    <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">{selecionado.nome}</h3>
                    <p className="text-xs font-bold text-gray-400 flex items-center gap-1 mt-1 uppercase">
                      <MapPin size={14} className="text-orange-500" /> {selecionado.locais?.nome || 'Galpão não definido'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Saldo Atual ({localEstoque.replace('estoque_', '')})</p>
                    <p className="text-3xl font-black text-gray-800">
                      {/* @ts-ignore */}
                      {selecionado[localEstoque] || 0}
                    </p>
                  </div>
                </div>

                {/* CONTROLES DE QUANTIDADE */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Layers size={14} /> Tamanho do Pacote/Lote
                    </label>
                    <button onClick={() => setShowManualQty(!showManualQty)} className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full">
                      {showManualQty ? "Usar Padrão" : "Alterar Lote"}
                    </button>
                  </div>

                  {showManualQty ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-5 gap-2">
                        {unidadesPredefinidas.map(u => (
                          <button key={u} onClick={() => { setQtdLote(u); setQtdCustom(''); }} className={`py-3 rounded-xl font-black text-xs transition-all ${qtdLote === u && qtdCustom === '' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}> {u} </button>
                        ))}
                      </div>
                      <input 
                        type="number" placeholder="Ou digite o valor unitário..."
                        className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500"
                        value={qtdCustom}
                        onChange={e => { setQtdCustom(e.target.value); setQtdLote(0); }}
                      />
                    </div>
                  ) : (
                    <div className="p-5 bg-blue-50/50 border-2 border-dashed border-blue-100 rounded-2xl flex items-center justify-between font-bold text-blue-800">
                      <span>Quantidade padrão do item:</span>
                      <span className="text-xl font-black">{selecionado?.qtd_padrao || 1} unidades</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2 text-center">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nº de Volumes</label>
                      <input 
                        type="number"
                        className="w-full p-4 bg-gray-100 rounded-3xl font-black text-4xl text-center outline-none border-4 border-transparent focus:border-blue-200 transition-all"
                        value={numPacotes}
                        onChange={e => setNumPacotes(Math.max('' as any, Number(e.target.value)))}
                      />
                    </div>
                    <div className={`rounded-[2rem] p-6 text-white flex flex-col justify-center items-center shadow-xl transition-all ${
                      tipoOperacao === 'adicionar' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      <p className="text-[10px] font-black uppercase opacity-80 tracking-tighter">Total do Ajuste</p>
                      <p className="text-5xl font-black">{numPacotes * unidadesPorPacote}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={processarMovimentacao}
                  disabled={loading}
                  className={`w-full py-6 rounded-[2rem] cursor-pointer font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 ${
                    tipoOperacao === 'adicionar' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'
                  } disabled:opacity-30`}
                >
                  {loading ? <RefreshCw className="animate-spin" /> : (
                    <>
                      {tipoOperacao === 'adicionar' ? <Plus size={20}/> : <Minus size={20}/>}
                      {tipoOperacao === 'adicionar' ? "Confirmar Entrada" : "Confirmar Saída"}
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 border-4 border-dashed border-gray-50 rounded-[3rem]">
                <div className="bg-gray-50 p-8 rounded-full mb-4">
                  <Package size={64} className="opacity-20" />
                </div>
                <p className="font-black uppercase text-xs tracking-widest">Selecione um produto para ajustar o estoque</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}