import React from 'react';
import { DashboardLayout } from './components/Dashboard/DashboardLayout';
import { StatCard } from './components/Dashboard/StatCard';
import { RecentActivity } from './components/Dashboard/RecentActivity';
import { useUiStore } from './store/uiStore';
import { KanbanBoard } from './components/Kanban/KanbanBoard';
import { JobModal } from './components/Kanban/JobModal';

// Mock Page Components to render inside our Layout
const DashboardPage: React.FC = () => (
  <div className="space-y-6">
    <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pulse-slow" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />
      
      <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
        Status do Sistema
      </span>
      <h2 className="text-3xl font-extrabold mt-1 text-slate-100">
        Bem-vindo ao <span className="text-gradient-cyber">CronFlow</span>
      </h2>
      <p className="text-sm text-slate-400 mt-2 max-w-xl">
        Sua plataforma integrada de agendamento e automação serverless. Configure tarefas, receba webhooks e analise histórico com latência sub-milissegundo.
      </p>
      
      <div className="flex gap-3 mt-6">
        <button className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 neon-glow-primary">
          Criar Nova Tarefa
        </button>
        <button className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 transition-all">
          Documentação API
        </button>
      </div>
    </div>

    {/* Metric Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        title="Tarefas Ativas"
        value="12 / 100"
        color="indigo"
        description="Limites do plano Starter"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <StatCard
        title="Taxa de Sucesso"
        value="99.87%"
        color="emerald"
        trend={{ value: "+0.12%", type: 'up' }}
        description="Últimas 24 horas"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <StatCard
        title="Tempo de Resposta Médio"
        value="142ms"
        color="purple"
        trend={{ value: "-14ms", type: 'up' }}
        description="Média geral de webhooks"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      />
    </div>

    {/* Recent Activity list */}
    <RecentActivity />
  </div>
);


const JobsPage: React.FC = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
    <KanbanBoard />
    <JobModal />
  </div>
);

const LogsPage: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-slate-100">Histórico de Auditoria</h2>
      <p className="text-xs text-slate-400">Logs detalhados de tentativas de disparos de webhooks.</p>
    </div>
    
    <div className="overflow-hidden rounded-2xl glass-panel border border-indigo-950/40">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-indigo-950/20 border-b border-indigo-950/40 text-slate-400">
            <th className="p-4 font-semibold uppercase tracking-wider">Job / ID</th>
            <th className="p-4 font-semibold uppercase tracking-wider">Status</th>
            <th className="p-4 font-semibold uppercase tracking-wider">Endpoint</th>
            <th className="p-4 font-semibold uppercase tracking-wider">Data/Hora</th>
            <th className="p-4 font-semibold uppercase tracking-wider">Duração</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-indigo-950/25">
          <tr className="hover:bg-indigo-950/10 transition-colors">
            <td className="p-4 font-medium text-slate-200">
              Billing Sync <span className="text-[10px] text-slate-500 ml-1">#cf_821d</span>
            </td>
            <td className="p-4">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                200 OK
              </span>
            </td>
            <td className="p-4 text-slate-400 font-mono">https://api.saas.sh/billing/sync</td>
            <td className="p-4 text-slate-400">Hoje às 14:15</td>
            <td className="p-4 text-slate-400 font-mono">142ms</td>
          </tr>
          <tr className="hover:bg-indigo-950/10 transition-colors">
            <td className="p-4 font-medium text-slate-200">
              Slack Alert <span className="text-[10px] text-slate-500 ml-1">#cf_259x</span>
            </td>
            <td className="p-4">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                204 OK
              </span>
            </td>
            <td className="p-4 text-slate-400 font-mono">https://hooks.slack.com/services/...</td>
            <td className="p-4 text-slate-400">Hoje às 14:00</td>
            <td className="p-4 text-slate-400 font-mono">88ms</td>
          </tr>
          <tr className="hover:bg-indigo-950/10 transition-colors">
            <td className="p-4 font-medium text-slate-200">
              Daily Clean Up <span className="text-[10px] text-slate-500 ml-1">#cf_019a</span>
            </td>
            <td className="p-4">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                500 Error
              </span>
            </td>
            <td className="p-4 text-slate-400 font-mono">https://api.saas.sh/db/cleanup</td>
            <td className="p-4 text-slate-400">Ontem às 23:59</td>
            <td className="p-4 text-slate-400 font-mono">1.2s</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const ProfilePage: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-slate-100">Configurações do Perfil</h2>
      <p className="text-xs text-slate-400">Gerencie informações da sua conta e credenciais de segurança.</p>
    </div>
    
    <div className="p-6 rounded-2xl glass-panel space-y-4 max-w-xl">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Endereço de E-mail</label>
        <input
          type="email"
          disabled
          value="admin@cronflow.sh"
          className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-indigo-950/40 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-indigo-500/40"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Nova Senha</label>
        <input
          type="password"
          placeholder="••••••••••••"
          className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-indigo-950/40 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-indigo-500/40"
        />
      </div>
      <button className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md neon-glow-primary">
        Salvar Alterações
      </button>
    </div>
  </div>
);

const SettingsPage: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-slate-100">Configurações do Projeto</h2>
      <p className="text-xs text-slate-400">Configure chaves de API e alertas globais.</p>
    </div>
    
    <div className="p-6 rounded-2xl glass-panel space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">Chaves de API do Workspace</h3>
        <p className="text-xs text-slate-400">Use essa chave para autenticar requisições na nossa API REST de agendamentos.</p>
        
        <div className="flex gap-2 max-w-xl">
          <input
            type="text"
            readOnly
            value="cf_live_9a3jFk82Lsq10Pd9aM"
            className="flex-1 px-3.5 py-2.5 bg-slate-900/60 border border-indigo-950/40 rounded-xl font-mono text-xs text-indigo-400 select-all focus:outline-none"
          />
          <button className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 transition-all">
            Copiar
          </button>
        </div>
      </div>
      
      <div className="border-t border-indigo-950/20 pt-6 space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">Webhooks de Alerta</h3>
        <p className="text-xs text-slate-400">URL para notificar quando um job falhar mais de 3 vezes consecutivas.</p>
        
        <div className="flex gap-2 max-w-xl">
          <input
            type="text"
            placeholder="https://sua-api.com/alertas"
            className="flex-1 px-3.5 py-2.5 bg-slate-900/60 border border-indigo-950/40 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-indigo-500/40"
          />
          <button className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md neon-glow-primary">
            Atualizar
          </button>
        </div>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const { activeTab } = useUiStore();

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'jobs':
        return <JobsPage />;
      case 'logs':
        return <LogsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <DashboardLayout>
      {renderActivePage()}
    </DashboardLayout>
  );
};

export default App;
