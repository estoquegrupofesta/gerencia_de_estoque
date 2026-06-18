import React, { useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
import { supabase } from '../lib/supabaseClient';
import { 
  Database, 
  Search, 
  RefreshCcw,
  AlertCircle,
  MapPin, 
  X,
  Pencil,
  Check,
  Save,
  Barcode,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers
} from 'lucide-react';

// Nova Interface baseada exatamente nas imagens da tabela do Supabase
interface Produto {
  id: string;
  cod: number | string;
  codigo_de_barras: number | string;
  nome: string;
  enderecamento: string; // Nova coluna principal
  estoque_atual: number;
  estoque_mat_prima: string; // Alterado para text conforme imagem
  comentarios: string;
}

export function EstoqueManager() {
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  
  // Estado de Filtros focado em Endereçamento
  const [abaPrincipal, setAbaPrincipal] = useState<'todos' | 'critico'>('todos');
  const [filtroEnderecamento, setFiltroEnderecamento] = useState<string>('todos');
  
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 21;

  const [produtos, setProdutos] = useState<Produto[]>([]);
  
  // Estados para Modais e Edição
  const [itemSelecionado, setItemSelecionado] = useState<Produto | null>(null);
  const [itemParaEdicao, setItemParaEdicao] = useState<Produto | null>(null);
  
  // Estados do Formulário de Edição ajustados
  const [editNome, setEditNome] = useState('');
  const [editCod, setEditCod] = useState<string | number>('');
  const [editBarcode, setEditBarcode] = useState<string | number>('');
  const [editEnderecamento, setEditEnderecamento] = useState('');
  const [editEstoqueAtual, setEditEstoqueAtual] = useState<number>(0);
  const [editEstoqueMatPrima, setEditEstoqueMatPrima] = useState(''); // Text
  const [editComentarios, setEditComentarios] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  useEffect(() => {
    carregarEstoque();
  }, []);

  async function carregarEstoque() {
    setLoading(true);
    setErro(null);
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*');

      if (error) throw error;
      
      // ORDENAÇÃO: Itens com estoque primeiro, depois zerados/negativos (Ordenados por Nome de A-Z)
      const listaOrdenada = (data || []).sort((a, b) => {
        const aTemEstoque = (a.estoque_atual ?? 0) > 0;
        const bTemEstoque = (b.estoque_atual ?? 0) > 0;

        if (aTemEstoque && !bTemEstoque) return -1;
        if (!aTemEstoque && bTemEstoque) return 1;
        
        return (a.nome || '').localeCompare(b.nome || '');
      });

      setProdutos(listaOrdenada);
    } catch (err: any) {
      console.error(err);
      setErro(err.message || "Erro ao carregar dados do Supabase.");
    } finally {
      setLoading(false);
    }
  }

  // Gera lista única de endereçamentos dinâmicos vindos do banco
  const enderecamentosDisponiveis = useMemo(() => {
    const lista = produtos.map(p => p.enderecamento).filter(Boolean);
    return Array.from(new Set(lista)).sort();
  }, [produtos]);

  const iniciarEdicao = (e: React.MouseEvent, item: Produto) => {
    e.stopPropagation();
    setItemParaEdicao(item);
    setEditNome(item.nome || '');
    setEditCod(item.cod ?? '');
    setEditBarcode(item.codigo_de_barras ?? '');
    setEditEnderecamento(item.enderecamento || '');
    setEditEstoqueAtual(item.estoque_atual ?? 0);
    setEditEstoqueMatPrima(item.estoque_mat_prima || '');
    setEditComentarios(item.comentarios || '');
  };

  async function salvarEdicaoEstoque() {
    if (!itemParaEdicao) return;
    setSalvandoEdicao(true);
    setErro(null);

    try {
      const updateData = {
        nome: editNome,
        cod: editCod === '' ? null : Number(editCod), // Convertendo para int8 do banco
        codigo_de_barras: editBarcode === '' ? null : Number(editBarcode), // Convertendo para int8 do banco
        enderecamento: editEnderecamento || null,
        estoque_atual: editEstoqueAtual,
        estoque_mat_prima: editEstoqueMatPrima || null, // Mantido como text
        comentarios: editComentarios || null
      };

      const { error } = await supabase
        .from('produtos')
        .update(updateData)
        .eq('id', itemParaEdicao.id);

      if (error) throw error;

      setSucesso("Produto atualizado com sucesso!");
      setItemParaEdicao(null);
      carregarEstoque();
    } catch (err: any) {
      setErro(err.message || "Erro ao salvar alterações.");
    } finally {
      setSalvandoEdicao(false);
      setTimeout(() => setSucesso(null), 3000);
    }
  }

  // FILTRAGEM MULTI-NÍVEL GLOBAL COM NOVAS COLUNAS
  const dadosFiltradosEBuscados = useMemo(() => {
    let base = produtos;

    // 1. Filtro de Abas (Todos vs Crítico)
    if (abaPrincipal === 'critico') {
      base = base.filter(p => (p.estoque_atual ?? 0) <= 5);
    }

    // 2. Filtro de Endereçamento
    if (filtroEnderecamento !== 'todos') {
      base = base.filter(p => p.enderecamento === filtroEnderecamento);
    }

    // 3. Executa a busca inteligente sobre a tabela adaptada
    if (!busca) return base;
    
    const fuseGlobal = new Fuse(base, {
      keys: ['nome', 'cod', 'codigo_de_barras', 'enderecamento', 'estoque_mat_prima', 'comentarios'],
      threshold: 0.3,
      ignoreLocation: true,
    });

    return fuseGlobal.search(busca).map(result => result.item);
  }, [produtos, abaPrincipal, filtroEnderecamento, busca]);

  const totalPaginas = Math.ceil(dadosFiltradosEBuscados.length / ITENS_POR_PAGINA);
  
  const produtosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    return dadosFiltradosEBuscados.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [dadosFiltradosEBuscados, paginaAtual, ITENS_POR_PAGINA]);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden font-sans">
      
      {/* HEADER ESCURO DO PAINEL */}
      <div className="bg-gray-900 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          
          {/* SELETOR DE ABAS */}
          <div className="flex bg-gray-800 p-1 rounded-xl overflow-x-auto w-full lg:w-auto">
            <button 
              onClick={() => { setAbaPrincipal('todos'); setPaginaAtual(1); }} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs cursor-pointer whitespace-nowrap transition-all ${abaPrincipal === 'todos' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Database size={16} /> TODOS OS PRODUTOS
            </button>
            <button 
              onClick={() => { setAbaPrincipal('critico'); setPaginaAtual(1); }} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs cursor-pointer whitespace-nowrap transition-all ${abaPrincipal === 'critico' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <AlertCircle size={16} /> ESTOQUE CRÍTICO (≤5)
            </button>
          </div>

          {/* BARRA DE BUSCA INTELIGENTE */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por nome, código, EAN ou endereço..." 
                className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500 transition-colors" 
                value={busca} 
                onChange={(e) => { setBusca(e.target.value); setPaginaAtual(1); }} 
              />
            </div>
            <button 
              onClick={carregarEstoque} 
              className="p-2 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white cursor-pointer transition-colors"
              title="Atualizar dados"
            >
              <RefreshCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* SUB-BARRA DE FILTROS SELETORES DINÂMICOS */}
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 text-gray-500 text-xs font-black uppercase tracking-wider">
          <Filter size={14} className="text-gray-400" /> Filtro Logístico:
        </div>

        {/* Seletor de Endereçamento */}
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] font-black uppercase text-gray-400">Filtrar por Endereço:</label>
          <select 
            value={filtroEnderecamento} 
            onChange={(e) => { setFiltroEnderecamento(e.target.value); setPaginaAtual(1); }}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-white border-gray-200 text-gray-700 outline-none focus:border-blue-500 cursor-pointer uppercase shadow-sm"
          >
            <option value="todos">Todos os Endereços</option>
            {enderecamentosDisponiveis.map(end => (
              <option key={end} value={end}>{end.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Reset rápido de filtros */}
        {filtroEnderecamento !== 'todos' && (
          <button 
            onClick={() => { setFiltroEnderecamento('todos'); setPaginaAtual(1); }}
            className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase underline cursor-pointer ml-auto"
          >
            Limpar Filtro
          </button>
        )}
      </div>

      {/* NOTIFICAÇÕES */}
      {erro && <div className="m-6 p-4 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 border border-red-100"><AlertCircle size={18} /> {erro}</div>}
      {sucesso && <div className="m-6 p-4 bg-green-50 text-green-700 text-xs font-bold rounded-xl flex items-center gap-2 border border-green-100"><Check size={18} /> {sucesso}</div>}

      {/* GRID DE CARDS PREMIUM REORGANIZADO */}
      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <RefreshCcw className="animate-spin text-blue-600 mb-4" size={36} />
            <p className="text-gray-400 font-black text-xs tracking-widest">SINCRONIZANDO COM SUPABASE...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {produtosPaginados.length > 0 ? (
                produtosPaginados.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => setItemSelecionado(item)} 
                    className="border-2 border-gray-50 rounded-2xl p-5 hover:border-blue-200 hover:shadow-lg bg-white cursor-pointer group flex flex-col justify-between transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="truncate pr-2">
                        {/* DESTAQUE DO ENDEREÇAMENTO NO TOPO DO CARD */}
                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1">
                          <MapPin size={12} className="shrink-0" /> {item.enderecamento || 'Sem Endereço'}
                        </p>
                        <h3 className="font-black text-gray-800 uppercase text-xs mt-1 group-hover:text-blue-600 truncate">
                          {item.nome}
                        </h3>
                        <div className="flex gap-2 text-[10px] font-mono text-gray-400 mt-1">
                          <span>CÓD: {item.cod}</span>
                          {item.codigo_de_barras && <span>| EAN: {item.codigo_de_barras}</span>}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => iniciarEdicao(e, item)} 
                        className="p-2 bg-gray-50 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600 border border-transparent hover:border-amber-200 cursor-pointer transition-all shrink-0"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>

                    {/* SEÇÃO DE SALDOS ADAPTADA */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-end gap-2">
                      <div className="flex gap-6">
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Estoque Atual</p>
                          <p className={`text-xl font-black ${item.estoque_atual <= 0 ? 'text-red-500 font-mono' : item.estoque_atual <= 5 ? 'text-amber-500' : 'text-gray-800'}`}>
                            {item.estoque_atual} <span className="text-[10px] font-bold text-gray-400 uppercase">un</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Mat. Prima</p>
                          <p className="text-sm font-black text-gray-600 mt-1 truncate max-w-[100px]" title={item.estoque_mat_prima}>
                            {item.estoque_mat_prima || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-gray-400 text-[10px] font-bold uppercase shrink-0">
                        <Layers size={11} />
                        <span>PRODUTO</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-gray-400 font-bold text-xs uppercase tracking-wide">
                  Nenhum produto cadastrado com os critérios selecionados.
                </div>
              )}
            </div>

            {/* PAGINAÇÃO */}
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100">
              <button 
                disabled={paginaAtual === 1}
                onClick={() => setPaginaAtual(p => p - 1)}
                className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl disabled:opacity-40 disabled:hover:bg-gray-50 cursor-pointer transition-all"
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
                Página {paginaAtual} de {totalPaginas || 1}
              </span>
              <button 
                disabled={paginaAtual >= totalPaginas || totalPaginas === 0}
                onClick={() => setPaginaAtual(p => p + 1)}
                className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl disabled:opacity-40 disabled:hover:bg-gray-50 cursor-pointer transition-all"
              >
                Próxima <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* FORMULÁRIO DE EDIÇÃO ATUALIZADO */}
      {itemParaEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8">
            
            <div className="bg-amber-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Pencil size={18} />
                <div>
                  <h2 className="font-black uppercase tracking-tight text-xs">Painel de Ajuste de Item</h2>
                  <p className="text-[10px] text-amber-100 font-bold uppercase">CÓD INTERNO: {itemParaEdicao.cod}</p>
                </div>
              </div>
              <button onClick={() => setItemParaEdicao(null)} className="p-1.5 hover:bg-amber-700 rounded-xl text-white cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Nome */}
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Nome do Produto</label>
                  <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs text-gray-800 uppercase bg-gray-50 outline-none focus:border-amber-500" />
                </div>

                {/* Código Interno (Chave int8) */}
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Cód Interno (Numérico)</label>
                  <input type="number" value={editCod} onChange={(e) => setEditCod(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-700 bg-gray-50 outline-none focus:border-amber-500" />
                </div>

                {/* Código de Barras (EAN int8) */}
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Código de Barras (EAN)</label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input type="number" value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 bg-gray-50 outline-none focus:border-amber-500" />
                  </div>
                </div>

                {/* Localização / Endereçamento */}
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Endereçamento Logístico</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input type="text" value={editEnderecamento} onChange={(e) => setEditEnderecamento(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 outline-none focus:border-amber-500 uppercase" />
                  </div>
                </div>

                {/* SALDOS EM GRUPO ADAPTADOS */}
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 md:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Estoque Físico Atual</label>
                    <input type="number" value={editEstoqueAtual} onChange={(e) => setEditEstoqueAtual(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-xl font-black text-sm bg-white outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Estoque Matéria Prima (Texto)</label>
                    <input type="text" value={editEstoqueMatPrima} onChange={(e) => setEditEstoqueMatPrima(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl font-black text-sm bg-white outline-none focus:border-amber-500" />
                  </div>
                </div>

                {/* Comentários */}
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Comentários / Observações</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <textarea rows={2} value={editComentarios} onChange={(e) => setEditComentarios(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-700 bg-gray-50 outline-none focus:border-amber-500" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100 justify-end">
                <button type="button" onClick={() => setItemParaEdicao(null)} className="px-5 py-2.5 border border-gray-200 text-gray-500 rounded-xl font-bold text-xs uppercase cursor-pointer hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button 
                  type="button" 
                  disabled={salvandoEdicao} 
                  onClick={salvarEdicaoEstoque} 
                  className="px-6 py-2.5 bg-amber-600 text-white rounded-xl font-black text-xs uppercase hover:bg-amber-700 flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                >
                  <Save size={14} /> {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETALHES SIMPLES (MODAL CLIQUE) */}
      {itemSelecionado && !itemParaEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setItemSelecionado(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
              <h2 className="font-black uppercase tracking-tight text-sm">Ficha do Produto</h2>
              <button onClick={() => setItemSelecionado(null)} className="p-2 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome do Item</p>
                <p className="text-base font-black text-gray-800 uppercase leading-tight">{itemSelecionado.nome}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase">Cód. Interno</p>
                  <p className="text-xs font-bold text-gray-700 font-mono">{itemSelecionado.cod}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase">EAN / Barras</p>
                  <p className="text-xs font-bold text-gray-700 font-mono truncate">{itemSelecionado.codigo_de_barras || 'N/A'}</p>
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                <p className="text-[9px] font-black text-emerald-600 uppercase">Endereço de Armazenamento</p>
                <p className="text-xs font-bold text-emerald-900 uppercase">{itemSelecionado.enderecamento || 'Pátio / Geral'}</p>
              </div>
              {itemSelecionado.comentarios && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observações Técnicas</p>
                  <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 font-medium italic">"{itemSelecionado.comentarios}"</p>
                </div>
              )}
              <button onClick={() => setItemSelecionado(null)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-black uppercase text-xs cursor-pointer hover:bg-gray-800 transition-colors">
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}