import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Package, Users, Activity, AlertCircle } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalProdutos: 0,
    estoqueBaixo: 0,
    ordensAbertas: 0,
    totalFreelancers: 0
  });

  useEffect(() => {
    async function loadStats() {
      // Aqui buscaremos os dados reais do seu Supabase
      // Exemplo de lógica:
      const { count: prodCount } = await supabase.from('produtos').select('*', { count: 'exact', head: true });
      const { count: freeCount } = await supabase.from('freelancers').select('*', { count: 'exact', head: true });
      const { count: ordensCount } = await supabase.from('ordens_producao').select('*', { count: 'exact', head: true }).eq('status', 'pendente');
      
      setStats({
        totalProdutos: prodCount || 0,
        estoqueBaixo: 5, // Faremos uma query específica para isso depois
        ordensAbertas: ordensCount || 0,
        totalFreelancers: freeCount || 0
      });
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Visão Geral</h2>
        <p className="text-gray-500 font-medium">Bem-vindo ao centro de comando do Grupo Festa.</p>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Produtos" value={stats.totalProdutos} icon={<Package />} color="bg-blue-500" />
        <StatCard title="Estoque Baixo" value={stats.estoqueBaixo} icon={<AlertCircle />} color="bg-red-500" />
        <StatCard title="Produção Ativa" value={stats.ordensAbertas} icon={<Activity />} color="bg-orange-500" />
        <StatCard title="Freelancers" value={stats.totalFreelancers} icon={<Users />} color="bg-purple-500" />
      </div>

      {/* ÁREA DE GRÁFICOS (Próximo passo) */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm min-h-[300px] flex items-center justify-center">
        <p className="text-gray-300 font-black uppercase tracking-widest italic">Gráfico de Movimentação em breve...</p>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-50 shadow-sm flex items-center gap-5">
      <div className={`p-4 rounded-2xl text-white ${color} shadow-lg shadow-current/20`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-gray-800">{value}</p>
      </div>
    </div>
  );
}