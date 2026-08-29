import React from 'react';

export const TermsPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#070913] text-slate-300 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="max-w-4xl mx-auto space-y-8 bg-[#0a0d1d]/80 border border-indigo-950/60 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-950/60 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                Documento Legal
              </span>
              <span className="text-xs text-slate-500 font-mono">Última atualização: Agosto de 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Termos de Serviço & Contrato de Assinatura
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Condições gerais de contratação e uso da plataforma CronFlow.
            </p>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-indigo-950 rounded-xl hover:bg-indigo-950/50 transition-all cursor-pointer w-fit"
            >
              ← Voltar ao App
            </button>
          )}
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-slate-350 select-text">
          
          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-indigo-400">1.</span> Objeto e Descrição dos Serviços
            </h2>
            <p>
              O <strong>CronFlow</strong> é uma plataforma SaaS (Software as a Service) especializada em agendamento, orquestração e monitoramento de requisições HTTP e disparos de webhooks automatizados. O serviço inclui interface web, API REST, agendamento de alta precisão e logs de telemetria.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-indigo-400">2.</span> Planos, Assinaturas e Cobrança Recorrente
            </h2>
            <p>
              O CronFlow opera no modelo <em>Freemium</em> com os seguintes planos disponíveis:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Plano Free</strong>: Acesso gratuito limitado a até 5 jobs agendados, retenção de logs por 7 dias e suporte comunitário.</li>
              <li><strong>Plano PRO (Mensal ou Anual)</strong>: Permite até 50 jobs agendados, retenção de logs por 90 dias, múltiplos workspaces, alertas via webhook assinados (HMAC) e fluxos avançados.</li>
            </ul>
            <p>
              Ao assinar o Plano PRO, o CONTRATANTE autoriza a cobrança periódica e recorrente através do gateway de pagamento parceiro (<strong>Asaas Gestão Financeira Instituição de Pagamento S.A.</strong>) via Cartão de Crédito, Boleto Bancário ou Pix, até que haja cancelamento formal pelo painel.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-indigo-400">3.</span> Direito de Arrependimento e Cancelamento
            </h2>
            <p>
              <strong>Garantia de 7 Dias (Art. 49 do CDC)</strong>: Para novas assinaturas, o usuário tem o direito de desistir da contratação no prazo de 7 (sete) dias corridos a partir da data de confirmação do pagamento, com reembolso integral do valor pago, bastando solicitar via e-mail de suporte.
            </p>
            <p>
              <strong>Cancelamento a Qualquer Momento</strong>: O cancelamento da renovação automática pode ser realizado diretamente na aba <em>Perfil & Faturamento</em> do sistema. O acesso aos recursos PRO permanecerá disponível até o término do ciclo já quitado (mês ou ano vigente), sem cobrança de multas rescisórias.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-indigo-400">4.</span> Política de Uso Aceitável (AUP)
            </h2>
            <p>
              É estritamente proibido utilizar o CronFlow para:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-rose-300/90">
              <li>Ataques de Negação de Serviço (DDoS/DoS) ou bombardeamento malicioso de endpoints terceiros.</li>
              <li>Disparo de SPAM, phishing ou propagação de malwares/scripts nocivos.</li>
              <li>Tentativas de engenharia reversa, invasão ou sobrecarga não autorizada da infraestrutura do CronFlow.</li>
            </ul>
            <p>
              A violação desta política resultará no cancelamento imediato da conta sem direito a reembolso e encaminhamento às autoridades competentes.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-indigo-400">5.</span> Nível de Serviço (SLA) & Disponibilidade
            </h2>
            <p>
              Empregamos infraestrutura redundante e monitoramento 24/7 buscando manter disponibilidade de <strong>99,5% (noventa e nove vírgula cinco por cento)</strong> ao mês. Janelas de manutenção programada serão comunicadas previamente por e-mail ou aviso no painel.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-indigo-400">6.</span> Foro e Legislação Aplicável
            </h2>
            <p>
              Este contrato é regido pelas leis da República Federativa do Brasil, incluindo o Marco Civil da Internet (Lei nº 12.965/14) e o Código de Defesa do Consumidor (Lei nº 8.078/90). Fica eleito o foro da Comarca do domicílio do consumidor para dirimir quaisquer dúvidas decorrentes deste instrumento.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-indigo-950/60 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>© {new Date().getFullYear()} CronFlow. Todos os direitos reservados.</div>
          <div className="flex items-center gap-4">
            <a href="mailto:jandersongustavo01@gmail.com" className="text-indigo-400 hover:text-indigo-300 underline">
              Suporte Jurídico & Dúvidas
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
