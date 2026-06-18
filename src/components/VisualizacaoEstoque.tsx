import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Database, 
  PackageCheck, 
  Search, 
  RefreshCcw,
  AlertCircle,
  LayoutGrid,
  MapPin, 
  X,
  Pencil,
  Check,
  Save
} from 'lucide-react';

// Interfaces para os Selects Amigáveis
interface CategoriaOpcao { id: string; nome: string; }
interface LocalOpcao { id: string; nome: string; }
interface FornecedorOpcao { id: string; nome: string; }

// Interface do Estoque Geral
interface ItemGeralEstoque {
  id: string;
  nome: string;
  sku: string;
  barcode?: string;
  qtd: number;
  estoque_producao?: number;
  estoque_unitarizado?: number;
  unidade: string;
  tipo_origem: 'produto_bruto' | 'encarte' | 'embalagem';
  categoria_nome: string;
  categoria_id?: string;
  local_nome: string;
  local_id: string;
  qtd_padrao?: number;
  tamanho?: string;
  nivel_dificuldade?: string;
  fornecedor_nome?: string;
  fornecedor_id?: string;
}

export function VisualizacaoEstoque() {
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  
  const [abaPrincipal, setAbaPrincipal] = useState<'materia-prima' | 'unitarizado' | 'critico'>('materia-prima');
  const [subFiltroMateria, setSubFiltroMateria] = useState<'todos' | 'produtos' | 'encartes' | 'embalagens'>('todos');

  const [materiasPrimas, setMateriasPrimas] = useState<ItemGeralEstoque[]>([]);
  const [unitarizados, setUnitarizados] = useState<ItemGeralEstoque[]>([]);
  const [estoqueCritico, setEstoqueCritico] = useState<ItemGeralEstoque[]>([]);
  
  // ESTADOS PARA OS SELECTS (Opções vindas do Banco)
  const [listaCategorias, setListaCategorias] = useState<CategoriaOpcao[]>([]);
  const [listaLocais, setListaLocais] = useState<LocalOpcao[]>([]);
  const [listaFornecedores, setListaFornecedores] = useState<FornecedorOpcao[]>([]);

  // Estados para Modais
  const [itemSelecionado, setItemSelecionado] = useState<ItemGeralEstoque | null>(null);
  const [itemParaEdicao, setItemParaEdicao] = useState<ItemGeralEstoque | null>(null);
  
  // ESTADOS DO FORMULÁRIO DE EDIÇÃO
  const [editNome, setEditNome] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editTamanho, setEditTamanho] = useState('');
  const [editCategoriaId, setEditCategoriaId] = useState('');
  const [editEstoqueProducao, setEditEstoqueProducao] = useState<number>(0);
  const [editEstoqueUnitarizado, setEditEstoqueUnitarizado] = useState<number>(0);
  const [editNivelDificuldade, setEditNivelDificuldade] = useState('');
  const [editQtdPadrao, setEditQtdPadrao] = useState<number>(0);
  const [editLocalId, setEditLocalId] = useState('');
  const [editFornecedorId, setEditFornecedorId] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  // Busca dados de apoio junto com o estoque
  async function carregarDadosIniciais() {
    setLoading(true);
    await Promise.all([
      fetchOpcoesSelects(),
      fetchEstoque()
    ]);
    setLoading(false);
  }

  // Carrega tabelas auxiliares para alimentar os Selects do Painel humano
  async function fetchOpcoesSelects() {
    try {
      const [catRes, locRes, fornRes] = await Promise.all([
        supabase.from('categorias').select('id, nome'),
        supabase.from('locais').select('id, nome'),
        supabase.from('fornecedores').select('id, nome')
      ]);

      if (catRes.data) setListaCategorias(catRes.data);
      if (locRes.data) setListaLocais(locRes.data);
      if (fornRes.data) setListaFornecedores(fornRes.data);
    } catch (err) {
      console.error("Erro ao carregar auxiliares do formulário:", err);
    }
  }

  const extrairNomeRelacionamento = (dadosRaw: any): string => {
    if (!dadosRaw) return 'Geral';
    if (Array.isArray(dadosRaw)) return dadosRaw[0]?.nome || 'Geral';
    return dadosRaw.nome || 'Geral';
  };

  async function fetchEstoque() {
    setErro(null);
    try {
      const { data: embalagens, error: embError } = await supabase.from('embalagem').select('id, plastico, estoque_producao, unidade_medida, local_id, locais(nome)');
      const { data: encartes, error: encError } = await supabase.from('encarte').select('id, nome, estoque_producao, sku, local_id, locais(nome)');
      
      const { data: produtosRaw, error: prodError } = await supabase.from('produtos').select(`
        id, nome, sku, barcode, estoque_producao, estoque_unitarizado, qtd_padrao, local_id, tamanho, nivel_dificuldade, categoria_id, fornecedor_id,
        categorias(nome), locais(nome), fornecedores(nome)
      `);

      if (embError) throw embError;
      if (encError) throw encError;
      if (prodError) throw prodError;

      // Lista Matéria-Prima
      const listaMaterias: ItemGeralEstoque[] = [
        ...(produtosRaw?.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          sku: p.sku || '-',
          barcode: p.barcode || '-',
          qtd: p.estoque_producao ?? 0,
          estoque_producao: p.estoque_producao ?? 0,
          estoque_unitarizado: p.estoque_unitarizado ?? 0,
          unidade: 'un',
          tipo_origem: 'produto_bruto' as const,
          categoria_nome: extrairNomeRelacionamento(p.categorias),
          categoria_id: p.categoria_id || '',
          local_nome: extrairNomeRelacionamento(p.locais),
          local_id: p.local_id || '',
          qtd_padrao: p.qtd_padrao || 0,
          tamanho: p.tamanho || '',
          nivel_dificuldade: p.nivel_dificuldade || '',
          fornecedor_nome: extrairNomeRelacionamento(p.fornecedores),
          fornecedor_id: p.fornecedor_id || ''
        })) || []),
        ...(encartes?.map((e: any) => ({
          id: e.id,
          nome: `Encarte: ${e.nome}`,
          sku: e.sku ? String(e.sku) : '-',
          qtd: e.estoque_producao ?? 0,
          estoque_producao: e.estoque_producao ?? 0,
          unidade: 'un',
          tipo_origem: 'encarte' as const,
          categoria_nome: 'ENCARTES',
          local_nome: extrairNomeRelacionamento(e.locais),
          local_id: e.local_id || ''
        })) || []),
        ...(embalagens?.map((emb: any) => ({
          id: emb.id,
          nome: `Plástico: ${emb.plastico}`,
          sku: '-',
          qtd: emb.estoque_producao ?? 0,
          estoque_producao: emb.estoque_producao ?? 0,
          unidade: emb.unidade_medida || 'un',
          tipo_origem: 'embalagem' as const,
          categoria_nome: 'EMBALAGENS',
          local_nome: extrairNomeRelacionamento(emb.locais),
          local_id: emb.local_id || ''
        })) || [])
      ];

      listaMaterias.sort((a, b) => b.qtd - a.qtd);
      setMateriasPrimas(listaMaterias);

      // Lista Unitarizados
      const listaUnitarizados: ItemGeralEstoque[] = produtosRaw?.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        sku: p.sku || '-',
        barcode: p.barcode || '-',
        qtd: p.estoque_unitarizado ?? 0,
        estoque_producao: p.estoque_producao ?? 0,
        estoque_unitarizado: p.estoque_unitarizado ?? 0,
        unidade: 'un',
        tipo_origem: 'produto_bruto' as const,
        categoria_nome: extrairNomeRelacionamento(p.categorias),
        categoria_id: p.categoria_id || '',
        local_nome: extrairNomeRelacionamento(p.locais),
        local_id: p.local_id || '',
        qtd_padrao: p.qtd_padrao || 50,
        tamanho: p.tamanho || '',
        nivel_dificuldade: p.nivel_dificuldade || '',
        fornecedor_nome: extrairNomeRelacionamento(p.fornecedores),
        fornecedor_id: p.fornecedor_id || ''
      })) || [];

      listaUnitarizados.sort((a, b) => b.qtd - a.qtd);
      setUnitarizados(listaUnitarizados);

      // Filtro Estoque Crítico
      const listaCriticos = listaUnitarizados.filter(p => p.qtd <= ((p.qtd_padrao || 50) * 0.2));
      listaCriticos.sort((a, b) => a.qtd - b.qtd);
      setEstoqueCritico(listaCriticos);

    } catch (err: any) {
      console.error(err);
      setErro(err.message || "Erro ao carregar estoque.");
    }
  }

  const iniciarEdicao = (e: React.MouseEvent, item: ItemGeralEstoque) => {
    e.stopPropagation();
    setItemParaEdicao(item);
    setEditNome(item.nome.replace("Encarte: ", "").replace("Plástico: ", ""));
    setEditSku(item.sku === '-' ? '' : item.sku);
    setEditBarcode(item.barcode || '');
    setEditTamanho(item.tamanho || '');
    setEditCategoriaId(item.categoria_id || '');
    setEditEstoqueProducao(item.estoque_producao || 0);
    setEditEstoqueUnitarizado(item.estoque_unitarizado || 0);
    setEditNivelDificuldade(item.nivel_dificuldade || '');
    setEditQtdPadrao(item.qtd_padrao || 0);
    setEditLocalId(item.local_id || '');
    setEditFornecedorId(item.fornecedor_id || '');
  };

  async function salvarEdicaoEstoque() {
    if (!itemParaEdicao) return;
    setSalvandoEdicao(true);
    setErro(null);
    setSucesso(null);

    try {
      let updateData: any = {};
      let tabelaAlvo = '';

      if (itemParaEdicao.tipo_origem === 'produto_bruto') {
        tabelaAlvo = 'produtos';
        updateData = {
          nome: editNome,
          sku: editSku || null,
          barcode: editBarcode || null,
          tamanho: editTamanho || null,
          estoque_producao: editEstoqueProducao,
          estoque_unitarizado: editEstoqueUnitarizado,
          nivel_dificuldade: editNivelDificuldade || null,
          qtd_padrao: editQtdPadrao,
          categoria_id: editCategoriaId || null,
          local_id: editLocalId || null,
          fornecedor_id: editFornecedorId || null
        };
      } else if (itemParaEdicao.tipo_origem === 'encarte') {
        tabelaAlvo = 'encarte';
        updateData = {
          nome: editNome,
          estoque_producao: editEstoqueProducao,
          local_id: editLocalId || null,
          sku: editSku ? (isNaN(Number(editSku)) ? null : Number(editSku)) : null
        };
      } else if (itemParaEdicao.tipo_origem === 'embalagem') {
        tabelaAlvo = 'embalagem';
        updateData = {
          plastico: editNome,
          estoque_producao: editEstoqueProducao,
          local_id: editLocalId || null
        };
      }

      const { error } = await supabase
        .from(tabelaAlvo)
        .update(updateData)
        .eq('id', itemParaEdicao.id);

      if (error) throw error;

      setSucesso("Alterações gravadas com sucesso!");
      setItemParaEdicao(null);
      fetchEstoque();

    } catch (err: any) {
      setErro(err.message || "Erro ao salvar alterações.");
    } finally {
      setSalvandoEdicao(false);
      setTimeout(() => setSucesso(null), 3000);
    }
  }

  const obterDadosFiltrados = () => {
    let base: ItemGeralEstoque[] = [];
    if (abaPrincipal === 'materia-prima') {
      base = materiasPrimas;
      if (subFiltroMateria === 'produtos') base = base.filter(i => i.tipo_origem === 'produto_bruto');
      if (subFiltroMateria === 'encartes') base = base.filter(i => i.tipo_origem === 'encarte');
      if (subFiltroMateria === 'embalagens') base = base.filter(i => i.tipo_origem === 'embalagem');
    } else if (abaPrincipal === 'unitarizado') {
      base = unitarizados;
    } else {
      base = estoqueCritico;
    }

    if (!busca) return base;
    const normalizar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const bN = normalizar(busca);

    return base.filter(i => normalizar(i.nome).includes(bN) || normalizar(i.sku).includes(bN));
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="bg-gray-900 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex bg-gray-800 p-1 rounded-xl overflow-x-auto w-full lg:w-auto">
            <button onClick={() => setAbaPrincipal('materia-prima')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs cursor-pointer whitespace-nowrap ${abaPrincipal === 'materia-prima' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}><Database size={16} /> MATÉRIA-PRIMA</button>
            <button onClick={() => setAbaPrincipal('unitarizado')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs cursor-pointer whitespace-nowrap ${abaPrincipal === 'unitarizado' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400'}`}><PackageCheck size={16} /> UNITARIZADO</button>
            <button onClick={() => setAbaPrincipal('critico')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs cursor-pointer whitespace-nowrap ${abaPrincipal === 'critico' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400'}`}><LayoutGrid size={16} /> CRÍTICO</button>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
              <input type="text" placeholder="Buscar (ex: padrao)..." className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-xs outline-none" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <button onClick={fetchEstoque} className="p-2 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white cursor-pointer"><RefreshCcw size={16} /></button>
          </div>
        </div>
      </div>

      {/* SUB-BARRA MATÉRIA PRIMA */}
      {abaPrincipal === 'materia-prima' && (
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex gap-2 overflow-x-auto">
          {['todos', 'produtos', 'encartes', 'embalagens'].map((f) => (
            <button key={f} onClick={() => setSubFiltroMateria(f as any)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border capitalize cursor-pointer ${subFiltroMateria === f ? 'bg-white border-blue-200 text-blue-600 shadow-sm' : 'text-gray-500'}`}>{f === 'produtos' ? 'Produtos (Bruto)' : f}</button>
          ))}
        </div>
      )}

      {/* NOTIFICAÇÕES */}
      {erro && <div className="m-6 p-4 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2"><AlertCircle size={18} /> {erro}</div>}
      {sucesso && <div className="m-6 p-4 bg-green-50 text-green-700 text-xs font-bold rounded-xl flex items-center gap-2"><Check size={18} /> {sucesso}</div>}

      {/* GRID DE CARDS */}
      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center py-20"><RefreshCcw className="animate-spin text-blue-600 mb-4" size={36} /><p className="text-gray-400 font-black text-xs tracking-widest">CARREGANDO...</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {obterDadosFiltrados().map((item: ItemGeralEstoque) => (
              <div key={item.id} onClick={() => setItemSelecionado(item)} className="border-2 border-gray-50 rounded-2xl p-5 hover:border-blue-200 hover:shadow-lg bg-white cursor-pointer group flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase text-blue-500">{item.categoria_nome}</p>
                    <h3 className="font-black text-gray-800 uppercase text-xs mt-0.5 group-hover:text-blue-600">{item.nome}</h3>
                    <span className="text-[10px] font-mono text-gray-400 block mt-1">SKU: {item.sku}</span>
                  </div>
                  <button onClick={(e) => iniciarEdicao(e, item)} className="p-2 bg-gray-50 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600 border border-transparent hover:border-amber-200 cursor-pointer"><Pencil size={15} /></button>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-end">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Saldo</p>
                    <p className="text-2xl font-black text-gray-800">{item.qtd} <span className="text-xs font-bold text-gray-400 uppercase">{item.unidade}</span></p>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 max-w-[120px] truncate"><MapPin size={12} /><span className="text-[10px] font-bold uppercase truncate">{item.local_nome}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* PAINEL HUMANO DE EDIÇÃO COMPLETO COM SELECTS DINÂMICOS */}
      {itemParaEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            
            <div className="bg-amber-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Pencil size={18} />
                <div>
                  <h2 className="font-black uppercase tracking-tight text-xs">Painel de Edição</h2>
                  <p className="text-[10px] text-amber-100 font-bold uppercase">Origem: {itemParaEdicao.tipo_origem}</p>
                </div>
              </div>
              <button onClick={() => setItemParaEdicao(null)} className="p-1.5 hover:bg-amber-700 rounded-xl text-white cursor-pointer"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Nome */}
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Nome do Item</label>
                  <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold text-xs text-gray-800 uppercase bg-gray-50 outline-none focus:border-amber-500" />
                </div>

                {/* SKU */}
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">SKU (Código Interno)</label>
                  <input type="text" value={editSku} onChange={(e) => setEditSku(e.target.value)} disabled={itemParaEdicao.tipo_origem === 'embalagem'} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 bg-gray-50 outline-none disabled:opacity-50" />
                </div>

                {/* Código de Barras */}
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Código de Barras (EAN)</label>
                  <input type="text" value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} disabled={itemParaEdicao.tipo_origem !== 'produto_bruto'} placeholder="Apenas produtos" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 bg-gray-50 outline-none disabled:opacity-50" />
                </div>

                {/* Tamanho */}
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Tamanho / Dimensões</label>
                  <input type="text" value={editTamanho} onChange={(e) => setEditTamanho(e.target.value)} disabled={itemParaEdicao.tipo_origem !== 'produto_bruto'} placeholder="Ex: Médio, G, 1L" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 outline-none disabled:opacity-50" />
                </div>

                {/* Nível de Dificuldade */}
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Nível de Dificuldade</label>
                  <select value={editNivelDificuldade} onChange={(e) => setEditNivelDificuldade(e.target.value)} disabled={itemParaEdicao.tipo_origem !== 'produto_bruto'} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 outline-none disabled:opacity-50">
                    <option value="">Selecione...</option>
                    <option value="Fácil">Fácil</option>
                    <option value="Médio">Médio</option>
                    <option value="Difícil">Difícil</option>
                    <option value="Avançado">Avançado</option>
                  </select>
                </div>

                {/* NÚMEROS DE ESTOQUE */}
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 md:col-span-2 grid grid-cols-2 gap-3">
                  <div className="col-span-2"><h4 className="text-[10px] font-black uppercase tracking-wider text-amber-800">Saldos de Estoques</h4></div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Estoque Produção / Bruto</label>
                    <input type="number" value={editEstoqueProducao} onChange={(e) => setEditEstoqueProducao(Number(e.target.value))} className="w-full px-3 py-1.5 border border-gray-200 rounded-xl font-black text-sm bg-white" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Estoque Unitarizado / Final</label>
                    <input type="number" value={editEstoqueUnitarizado} onChange={(e) => setEditEstoqueUnitarizado(Number(e.target.value))} disabled={itemParaEdicao.tipo_origem !== 'produto_bruto'} className="w-full px-3 py-1.5 border border-gray-200 rounded-xl font-black text-sm bg-white disabled:opacity-50" />
                  </div>
                </div>

                {/* Quantidade Padrão */}
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Quantidade Padrão Alvo</label>
                  <input type="number" value={editQtdPadrao} onChange={(e) => setEditQtdPadrao(Number(e.target.value))} disabled={itemParaEdicao.tipo_origem !== 'produto_bruto'} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 outline-none disabled:opacity-50" />
                </div>

                {/* SELECT HUMANO: CATEGORIAS */}
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Categoria Vinculada</label>
                  <select value={editCategoriaId} onChange={(e) => setEditCategoriaId(e.target.value)} disabled={itemParaEdicao.tipo_origem !== 'produto_bruto'} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 outline-none disabled:opacity-50">
                    <option value="">Nenhuma Categoria...</option>
                    {listaCategorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nome.toUpperCase()}</option>)}
                  </select>
                </div>

                {/* SELECT HUMANO: LOCALIZAÇÕES / GALPÕES */}
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Localização / Galpão Alvo</label>
                  <select value={editLocalId} onChange={(e) => setEditLocalId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 outline-none focus:border-amber-500">
                    <option value="">Selecione um Galpão...</option>
                    {listaLocais.map(loc => <option key={loc.id} value={loc.id}>{loc.nome.toUpperCase()}</option>)}
                  </select>
                </div>

                {/* SELECT HUMANO: FORNECEDORES */}
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Fornecedor do Item</label>
                  <select value={editFornecedorId} onChange={(e) => setEditFornecedorId(e.target.value)} disabled={itemParaEdicao.tipo_origem !== 'produto_bruto'} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 outline-none disabled:opacity-50">
                    <option value="">Nenhum Fornecedor...</option>
                    {listaFornecedores.map(forn => <option key={forn.id} value={forn.id}>{forn.nome.toUpperCase()}</option>)}
                  </select>
                </div>

              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100 justify-end">
                <button type="button" onClick={() => setItemParaEdicao(null)} className="px-5 py-2.5 border border-gray-200 text-gray-500 rounded-xl font-bold text-xs uppercase cursor-pointer">Cancelar</button>
                <button type="button" disabled={salvandoEdicao} onClick={salvarEdicaoEstoque} className="px-6 py-2.5 bg-amber-600 text-white rounded-xl font-black text-xs uppercase hover:bg-amber-700 flex items-center gap-1.5 shadow-md"><Save size={14} /> {salvandoEdicao ? "Salvando..." : "Salvar Painel Completo"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES */}
      {itemSelecionado && !itemParaEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
              <h2 className="font-black uppercase tracking-tight text-sm">Detalhes</h2>
              <button onClick={() => setItemSelecionado(null)} className="p-2 hover:bg-gray-800 rounded-xl cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome</p><p className="text-base font-black text-gray-800 uppercase leading-tight">{itemSelecionado.nome}</p></div>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                <p className="text-[9px] font-black text-blue-600 uppercase">Galpão / Local</p>
                <p className="text-xs font-bold text-blue-900 uppercase">{itemSelecionado.local_nome}</p>
              </div>
              <button onClick={() => setItemSelecionado(null)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-black uppercase text-xs cursor-pointer">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}