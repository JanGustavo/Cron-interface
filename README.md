# 🚀 CronFlow — Frontend (Web Interface)

Esta é a interface web (Single Page Application) do **CronFlow**, desenvolvida em React, TypeScript e Tailwind CSS v4. A interface fornece um painel interativo em tempo real para gerenciar e monitorar tarefas agendadas (Cron Jobs).

Para a documentação completa do projeto (incluindo arquitetura do backend, banco de dados, filas e deploy), consulte o **[README.md Principal da Raiz (Root)](https://github.com/JanGustavo/Cron/blob/master/README.md)**.

---

## 🛠️ Tecnologias Utilizadas

- **Core**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Gerenciamento de Estado**: [Zustand](https://zustand-demo.pmnd.rs/) (simples, rápido e reativo)
- **Consumo de API / Cache**: [TanStack React Query v5](https://tanstack.com/query/latest)
- **Gráficos**: [Recharts](https://recharts.org/) (gráficos customizados de performance/volume)
- **Biblioteca de Animações**: [Framer Motion](https://www.framer.com/motion/)
- **Kanban Drag & Drop**: [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) (Fork mantido do react-beautiful-dnd)
- **Cliente HTTP**: [Axios](https://axios-http.com/) com interceptores de conversão recursiva de formato de chaves (`camelCase` no React ⇄ `PascalCase/snake_case` no Go)

---

## 📂 Estrutura de Diretórios

```
cron front/
├── public/              ← Recursos públicos estáticos
├── src/
│   ├── assets/          ← Imagens, logos e arquivos estáticos compilados
│   ├── components/      ← Componentes organizados por contexto:
│   │   ├── Auth/        ← Portão de login (LoginGate)
│   │   ├── Dashboard/   ← Cards de estatísticas e atividades recentes
│   │   ├── Kanban/      ← Quadro Kanban, listas de jobs e modais de criação/edição
│   │   ├── Logs/        ← Histórico de execuções
│   │   └── Shared/      ← Toasts de notificação e utilitários visuais
│   │
│   ├── pages/           ← Páginas principais (DashboardPage, Logs, ProfilePage)
│   ├── services/        ← Instância configurada do Axios (api.ts) com mapeamento de tipagem Go/SQLC
│   ├── store/           ← Armazenamento de estado Zustand (authStore, jobsStore, uiStore)
│   ├── types/           ← Definições e interfaces TypeScript
│   │
│   ├── App.tsx          ← Componente raiz com controle de rotas locais e modal de documentação
│   ├── App.css          ← Estilos adicionais e micro-animações
│   ├── index.css        ← Inicialização do Tailwind CSS v4 e paleta de variáveis
│   └── main.tsx         ← Ponto de entrada do React
└── package.json
```

---

## ⚡ Como Rodar Localmente

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado (versão 18+ recomendada) e o backend em Go rodando localmente (por padrão na porta `8080`).

### Instalação
1. Instale os pacotes necessários:
   ```bash
   npm install
   ```

2. Configure a URL da API criando um arquivo `.env.local` na raiz da pasta `cron front/`:
   ```env
   VITE_API_URL=http://localhost:8080
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

   O site abrirá localmente no endereço **[http://localhost:5173/](http://localhost:5173/)**.

---

## 📦 Compilação para Produção (Build)

Para gerar os arquivos estáticos prontos para distribuição na pasta `/dist`:

```bash
npm run build
```

O script de deploy na raiz do projeto (`deploy.sh`) executa este build de forma automatizada e sincroniza os arquivos compilados diretamente com o servidor de hospedagem Nginx.
