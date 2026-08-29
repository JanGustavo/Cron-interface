import React from 'react';

export const PrivacyPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#070913] text-slate-300 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="max-w-4xl mx-auto space-y-8 bg-[#0a0d1d]/80 border border-indigo-950/60 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-950/60 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                Conformidade LGPD (Lei 13.709/18)
              </span>
              <span className="text-xs text-slate-500 font-mono">Vigência: Agosto de 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Política de Privacidade & Proteção de Dados
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Como coletamos, tratamos, protegemos e armazenamos suas informações pessoais.
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
              <span className="text-emerald-400">1.</span> Compromisso com a Privacidade
            </h2>
            <p>
              O <strong>CronFlow</strong> tem o compromisso inegociável de zelar pela segurança e privacidade dos dados de seus usuários, em total conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018)</strong> e o <strong>Marco Civil da Internet (Lei nº 12.965/2014)</strong>.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-emerald-400">2.</span> Dados Pessoais Coletados e Finalidades
            </h2>
            <div className="overflow-x-auto rounded-xl border border-indigo-950/40 mt-3">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-indigo-950/40 text-slate-300 border-b border-indigo-950/60 text-[10px] uppercase font-bold tracking-wider">
                    <th className="p-3">Categoria de Dados</th>
                    <th className="p-3">Finalidade do Tratamento</th>
                    <th className="p-3">Base Legal (Art. 7º LGPD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-950/30 text-slate-400">
                  <tr>
                    <td className="p-3 font-semibold text-slate-200">Nome, E-mail, Hash de Senha</td>
                    <td className="p-3">Criação de conta, autenticação segura e comunicação de alertas.</td>
                    <td className="p-3 font-mono text-[11px] text-indigo-300">Execução de Contrato (Inciso V)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-200">CPF / CNPJ, Endereço de Cobrança</td>
                    <td className="p-3">Processamento de assinaturas e emissão de notas fiscais.</td>
                    <td className="p-3 font-mono text-[11px] text-indigo-300">Obrigação Legal / Fiscal (Inciso II)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-200">Endereço IP e Logs de Acesso</td>
                    <td className="p-3">Auditoria de segurança, prevenção a fraudes e conformidade com o Marco Civil.</td>
                    <td className="p-3 font-mono text-[11px] text-indigo-300">Cumprimento de Obrigação Legal (Inciso II)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-200">URLs e Payloads dos Jobs</td>
                    <td className="p-3">Disparo e registro de execuções automatizadas solicitadas pelo cliente.</td>
                    <td className="p-3 font-mono text-[11px] text-indigo-300">Execução de Contrato (Inciso V)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-emerald-400">3.</span> Não Armazenamento de Dados de Cartão (PCI-DSS)
            </h2>
            <p>
              O CronFlow <strong>NÃO armazena nem processa números completos de cartão de crédito, CVV ou códigos de segurança</strong> em seus servidores. Todas as transações financeiras são intermediadas diretamente pelo <strong>Asaas Gestão Financeira</strong>, instituição homologada pelo Banco Central do Brasil e em conformidade estrita com o padrão internacional de segurança PCI-DSS.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-emerald-400">4.</span> Compartilhamento de Dados com Operadores Terceiros
            </h2>
            <p>
              Compartilhamos apenas os dados estritamente necessários com provedores de infraestrutura homologados:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Asaas</strong>: Processamento de pagamentos, boletos, Pix e faturamento.</li>
              <li><strong>Resend / SMTP</strong>: Disparo de e-mails transacionais (verificação de conta, recuperação de senha e alertas de erro).</li>
              <li><strong>Provedor de Nuvem</strong>: Hospedagem criptografada de banco de dados e servidores com backups diários.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-emerald-400">5.</span> Direitos dos Titulares de Dados (Art. 18 LGPD)
            </h2>
            <p>
              Você, como titular de seus dados pessoais, tem o direito de requisitar a qualquer momento:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Confirmação e Acesso</strong>: Visualização de todos os seus dados cadastrados na plataforma.</li>
              <li><strong>Correção / Atualização</strong>: Retificação de dados incompletos ou inexatos diretamente pelo painel.</li>
              <li><strong>Eliminação / Esquecimento</strong>: Exclusão permanente da sua conta e de todos os jobs/logs associados.</li>
              <li><strong>Portabilidade</strong>: Exportação do seu histórico de execuções em formato aberto (JSON/CSV).</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-emerald-400">6.</span> Retenção e Descarte de Dados
            </h2>
            <p>
              Logs de execuções de jobs são mantidos por <strong>7 dias (Plano Free)</strong> ou <strong>90 dias (Plano PRO)</strong>, sendo excluídos de forma automatizada e definitiva após o período correspondente. Ao excluir sua conta, os dados são removidos de imediato de nossas bases ativas.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-emerald-400">7.</span> Canal de Contato com o Encarregado de Dados (DPO)
            </h2>
            <p>
              Para exercer qualquer direito previsto na LGPD ou esclarecer dúvidas sobre esta política, entre em contato diretamente com o nosso Encarregado de Proteção de Dados:
            </p>
            <div className="p-4 rounded-xl border border-emerald-950/60 bg-emerald-950/20 text-emerald-300 font-mono text-xs">
              <strong>Encarregado (DPO)</strong>: Janderson Gustavo<br />
              <strong>E-mail de Contato</strong>: <a href="mailto:jandersongustavo01@gmail.com" className="underline hover:text-emerald-200">jandersongustavo01@gmail.com</a><br />
              <strong>Prazo de Resposta</strong>: Até 48 horas úteis.
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-indigo-950/60 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>© {new Date().getFullYear()} CronFlow. Privacidade e Segurança em primeiro lugar.</div>
          <div className="flex items-center gap-4">
            <a href="mailto:jandersongustavo01@gmail.com" className="text-emerald-400 hover:text-emerald-300 underline">
              Fale com o DPO
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
