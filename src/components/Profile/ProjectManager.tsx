import React from 'react';
import type { Project } from '../../types/auth';

interface ProjectManagerProps {
  isSwitchingProject: boolean;
  workspaceName: string;
  jobsUsagePercent: number;
  isProPlan: boolean;
  projects: Project[];
  globalMaxLimit: number;
  currentTotalJobsCreated: number;
  createProjectOpen: boolean;
  setCreateProjectOpen: (open: boolean) => void;
  newProjectName: string;
  setNewProjectName: (name: string) => void;
  creatingProject: boolean;
  handleCreateProject: (e: React.FormEvent) => void;
  editingProjectId: string | null;
  setEditingProjectId: (id: string | null) => void;
  editingProjectName: string;
  setEditingProjectName: (name: string) => void;
  handleRenameProject: (e: React.FormEvent, projectId: string) => void;
  handleSwitchProject: (project: Project) => void;
  handleDeleteProject: (projectId: string, projectName: string) => void;
  activeProject: Project | null;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  isSwitchingProject,
  workspaceName,
  jobsUsagePercent,
  isProPlan,
  projects,
  createProjectOpen,
  setCreateProjectOpen,
  newProjectName,
  setNewProjectName,
  creatingProject,
  handleCreateProject,
  editingProjectId,
  setEditingProjectId,
  editingProjectName,
  setEditingProjectName,
  handleRenameProject,
  handleSwitchProject,
  handleDeleteProject,
  activeProject,
  globalMaxLimit,
  currentTotalJobsCreated,
}) => {
  return (
    <div className="rounded-3xl glass-panel border border-indigo-950/40 p-6 space-y-4 text-left flex-1 relative">
      {isSwitchingProject && (
        <div className="absolute inset-0 bg-[#090c15]/75 backdrop-blur-[2px] rounded-3xl flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-slate-400">Alternando workspace...</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-200">Workspace & Limites</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Uso de recursos dentro do projeto ativo.</p>
        </div>
        <span className="text-[10px] font-bold font-mono text-cyan-400 bg-cyan-950/20 px-2 py-0.5 rounded-lg border border-cyan-500/10">
          {workspaceName}
        </span>
      </div>

      {/* Jobs Limit Progress */}
      <div className="space-y-2.5 p-4 bg-[#060812]/50 border border-indigo-950/40 rounded-2xl">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          <span>Limite de Tarefas</span>
          <span className="text-indigo-400 font-mono">{currentTotalJobsCreated} / {globalMaxLimit} Jobs</span>
        </div>
        <div className="h-2 rounded-full bg-slate-950/70 overflow-hidden relative">
          <div
            className="h-full bg-linear-to-r from-cyan-400 via-indigo-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${jobsUsagePercent}%` }}
          />
        </div>
        <p className="text-[9px] text-slate-500 leading-normal">
          Você está utilizando {jobsUsagePercent}% do limite total de jobs permitidos para o plano {isProPlan ? 'PRO' : 'FREE'} neste workspace.
        </p>
      </div>

      {/* Workspaces List (Cleaned Up) */}
      <div className="space-y-3 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Projetos Disponíveis ({projects.length})</span>
          {isProPlan ? (
            <button
              onClick={() => setCreateProjectOpen(!createProjectOpen)}
              className="text-[9px] font-extrabold tracking-wider text-indigo-400 hover:text-indigo-200 transition-colors cursor-pointer"
            >
              {createProjectOpen ? 'Cancelar' : '+ Novo projeto'}
            </button>
          ) : (
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-rose-500/80 bg-rose-950/20 px-2 py-0.5 rounded border border-rose-900/30 flex items-center gap-1 select-none">
              👑 PRO
            </span>
          )}
        </div>

        {createProjectOpen && (
          <form onSubmit={handleCreateProject} className="flex gap-2 p-3 bg-slate-950/40 border border-indigo-950/60 rounded-2xl animate-in slide-in-from-top-2 duration-200">
            <input
              type="text"
              placeholder="Nome do novo workspace..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#05070e] border border-indigo-950/60 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500/40"
              required
            />
            <button
              type="submit"
              disabled={creatingProject || !newProjectName.trim()}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingProject ? '...' : 'Criar'}
            </button>
          </form>
        )}

        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-indigo-950 scrollbar-track-transparent">
          {projects.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-[10px] italic">
              Nenhum projeto cadastrado.
            </div>
          ) : (
            projects.map((project) => {
              const isActive = project.id === activeProject?.id;
              return (
                <div
                  key={project.id}
                  onClick={() => !isActive && handleSwitchProject(project)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 group/item ${
                    isActive
                      ? 'border-indigo-500/30 bg-indigo-500/5'
                      : 'border-indigo-950/30 bg-slate-950/20 hover:border-indigo-500/20 hover:bg-[#070914] cursor-pointer'
                  }`}
                >
                  {editingProjectId === project.id ? (
                    <form
                      onSubmit={(e) => handleRenameProject(e, project.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 flex-1 min-w-0 mr-2"
                    >
                      <input
                        type="text"
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        className="px-2 py-1 bg-slate-900 border border-indigo-500/40 rounded text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
                        required
                        autoFocus
                      />
                      <button type="submit" className="text-emerald-400 hover:text-emerald-300 font-bold text-xs p-1 cursor-pointer">✓</button>
                      <button type="button" onClick={() => setEditingProjectId(null)} className="text-rose-450 hover:text-rose-350 font-bold text-xs p-1 cursor-pointer">✗</button>
                    </form>
                  ) : (
                    <div className="min-w-0 flex-1 group/item flex items-center gap-2 pr-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-slate-200 block truncate">{project.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono block truncate">ID: {project.id}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProjectId(project.id);
                          setEditingProjectName(project.name);
                        }}
                        className="opacity-0 group-hover/item:opacity-100 p-1 text-indigo-400/85 hover:text-indigo-300 transition-all cursor-pointer shrink-0"
                        title="Editar Nome"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span
                      onClick={() => !isActive && handleSwitchProject(project)}
                      className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-950/50 text-slate-500 border-slate-800 hover:border-indigo-500/30 hover:text-slate-350 cursor-pointer'
                      }`}
                    >
                      {isActive ? 'Ativo' : 'Trocar'}
                    </span>
                    {!isActive && (
                      <button
                        onClick={() => handleDeleteProject(project.id, project.name)}
                        className="p-1 text-rose-400/70 hover:text-rose-450 hover:bg-rose-950/20 rounded border border-transparent hover:border-rose-950/30 transition-all cursor-pointer"
                        title="Excluir Projeto"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
