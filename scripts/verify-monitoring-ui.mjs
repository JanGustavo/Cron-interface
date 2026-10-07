import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Render real components with fixture store state, without requests or notifications.
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { useUiStore } = await server.ssrLoadModule('/src/store/uiStore.ts');
  const { useJobsStore } = await server.ssrLoadModule('/src/store/jobsStore.ts');
  Object.assign(useUiStore.getInitialState(), { isLogModalOpen: true, selectedLogId: 'test-log' });
  Object.assign(useJobsStore.getInitialState(), {
    jobs: [{ id: 'job', name: 'Sincronização', webhookAlertUrl: 'https://example.com/alerts' }],
  });
  const { LogDetail } = await server.ssrLoadModule('/src/components/Logs/LogDetail.tsx');
  const log = {
    id: 'test-log', jobId: 'job', triggeredAt: '2026-10-06T12:00:00Z',
    status: 'success', httpStatus: 200, durationMs: 0, attemptNumber: 3,
    ruleEvaluations: [
      { ruleId: 'r', ruleName: 'Sincronização', passed: false, status: 'fail', message: 'Campo ausente' },
      { ruleId: 's', ruleName: 'Captura', passed: false, status: 'error', message: 'Corpo excede limite' },
      { ruleId: 'n', ruleName: 'Contagem', passed: true, status: 'pass', observedValue: 9007199254740992, observedValueText: '9007199254740993' },
      { ruleId: 'u', ruleName: 'Resposta', passed: false, status: 'skipped' },
    ],
  };
  const html = renderToStaticMarkup(React.createElement(LogDetail, { logs: [log] }));
  for (const expected of ['Não atendida', 'Erro de avaliação', 'Não avaliada', 'Atendida', 'Campo ausente', '0ms', '3ª Tentativa', '9007199254740993', 'não informa o estado de entrega']) {
    assert.ok(html.includes(expected), `Missing recorded evidence: ${expected}`);
  }
  for (const invented of ['Alerta Enviado com Sucesso', '1ª Tentativa', '2ª Tentativa', 'DNS resolvido com sucesso']) {
    assert.ok(!html.includes(invented), `Invented evidence: ${invented}`);
  }
  const legacy = renderToStaticMarkup(React.createElement(LogDetail, {
    logs: [{ ...log, ruleEvaluations: [{ ruleId: 'old', ruleName: 'Condição antiga', passed: true }] }],
  }));
  assert.ok(legacy.includes('Atendida'), 'Legacy passed field must remain readable');
  const { UserAvatar } = await server.ssrLoadModule('/src/components/Shared/UserAvatar.tsx');
  const emptyAvatar = renderToStaticMarkup(React.createElement(UserAvatar, { initials: 'JD' }));
  assert.ok(emptyAvatar.includes('JD') && !emptyAvatar.includes('<img'));
  const unsafeAvatar = renderToStaticMarkup(React.createElement(UserAvatar, { initials: 'JD', url: 'javascript:alert(1)' }));
  assert.ok(!unsafeAvatar.includes('<img'));
  const photo = renderToStaticMarkup(React.createElement(UserAvatar, { initials: 'JD', url: 'https://example.invalid/photo.png' }));
  assert.ok(photo.includes('<img') && photo.includes('referrerPolicy="no-referrer"'));
  const { formatGraceTime } = await server.ssrLoadModule('/src/utils/jobGrace.ts');
  const fixedNow = Date.parse('2026-10-06T12:00:00Z');
  assert.equal(formatGraceTime('2026-10-08T12:00:00Z', fixedNow), '48:00:00');
  assert.equal(formatGraceTime('2026-10-06T13:01:01Z', fixedNow), '01:01:01');
  assert.equal(formatGraceTime('2026-10-06T11:00:00Z', fixedNow), '00:00:00');
  const { useAuthStore } = await server.ssrLoadModule('/src/store/authStore.ts');
  const { JobGraceNotice } = await server.ssrLoadModule('/src/components/Dashboard/JobGraceNotice.tsx');
  const initialAuth = useAuthStore.getInitialState();
  const savedUser = initialAuth.user;
  initialAuth.user = { id: 'grace', plan: 'free', jobGrace: { endsAt: '2099-10-08T12:00:00Z', activeJobs: 8, maxJobs: 5, proEnded: true } };
  const graceHtml = renderToStaticMarkup(React.createElement(JobGraceNotice));
  for (const text of ['48 horas para ajustar', 'pause 3', 'mais antigos', 'Renovar Pro', 'Escolher jobs ativos', 'chat da IA', 'Nenhum job será apagado']) assert.ok(graceHtml.includes(text), text);
  initialAuth.user.jobGrace.activeJobs = 5;
  assert.equal(renderToStaticMarkup(React.createElement(JobGraceNotice)), '', 'Hide grace notice after the user selects five jobs');
  initialAuth.user = savedUser;
  const { MonitorPage } = await server.ssrLoadModule('/src/pages/MonitorPage.tsx');
  const previewHtml = renderToStaticMarkup(React.createElement(MonitorPage));
  for (const text of ['Validação de resultados', 'Jobs HTTP', 'Métricas via API', 'Selecione uma tarefa']) assert.ok(previewHtml.includes(text), text);
  const { GlobalMonitorPanel } = await server.ssrLoadModule('/src/components/Kanban/GlobalMonitorPanel.tsx');
  const metrics = renderToStaticMarkup(React.createElement(GlobalMonitorPanel, { rules: [], totalRules: 0, onChange: () => {} }));
  assert.ok(metrics.includes('Simular sem enviar alertas'));
  assert.ok(metrics.includes('não grava valores nem envia alertas'));
  const { JobMonitorRulesPanel } = await server.ssrLoadModule('/src/components/Kanban/JobMonitorRulesPanel.tsx');
  const panel = renderToStaticMarkup(React.createElement(JobMonitorRulesPanel, { job: { id: 'job' }, logs: [log] }));
  for (const text of ['1. Escolha uma resposta', '2. Campo e expectativa', '3. Como esta condição', '4. Testar antes de salvar', 'Apenas acompanhar', 'Exigir para considerar sucesso']) assert.ok(panel.includes(text), text);
  assert.match(panel, /disabled=""[^>]*>Salvar condição/);
  const { responseFields } = await server.ssrLoadModule('/src/types/monitoring.ts');
  const fields = responseFields('{"a.b":{"x/y":{"~":{"":false}}},"items":[{"value":null}]}');
  assert.deepEqual(fields.map((field) => [field.path, field.type]), [['/a.b/x~1y/~0/', 'boolean'], ['/items/0/value', 'null']]);
  const { ExecutionNotificationCursor, executionNotice } = await server.ssrLoadModule('/src/utils/executionNotifications.ts');
  const cursor = new ExecutionNotificationCursor();
  const failure = { ...log, id: 'baseline', status: 'validation_failed', transportStatus: 'success', triggeredAt: '2026-10-06T12:00:00Z' };
  assert.equal(cursor.consume([failure]).length, 0, 'Never replay historical alerts');
  assert.equal(cursor.consume([]).length, 0);
  assert.equal(cursor.consume([failure]).length, 0, 'Empty poll must preserve boundary IDs');
  const sameTime = { ...failure, id: 'same-time' };
  assert.equal(cursor.consume([sameTime, failure]).length, 1, 'New ID at same timestamp must notify');
  assert.equal(cursor.consume([sameTime]).length, 0, 'Partial poll must preserve existing IDs');
  assert.equal(cursor.consume([failure]).length, 0);
  const newer = { ...failure, id: 'newer', triggeredAt: '2026-10-06T12:00:00.000001Z' };
  assert.equal(cursor.consume([newer, sameTime]).length, 1);
  assert.equal(cursor.since, newer.triggeredAt, 'Compare fractional timestamps chronologically');
  assert.equal(cursor.consume([failure]).length, 0, 'Older response must not replay');
  assert.equal(executionNotice({ ...log, ruleEvaluations: [] }), null);
  assert.equal(executionNotice({ ...log, ruleEvaluations: [{ ruleName: 'Sync', status: 'fail' }] }).variant, 'warning');
  assert.equal(executionNotice({ ...log, ruleEvaluations: [{ ruleName: 'Sync', status: 'error' }] }).variant, 'error');
  assert.ok(executionNotice(failure).message.includes('Próximo job bloqueado'));
  const requiredHtml = renderToStaticMarkup(React.createElement(LogDetail, { logs: [{ ...failure, id: log.id, ruleEvaluations: [{ ruleId: 'r', ruleName: 'Sync', key: '/synced', mode: 'require_success', passed: false, status: 'fail' }] }] }));
  assert.ok(requiredHtml.includes('Obrigatória para considerar sucesso'));
  console.log('Monitoramento: renderização dos estados, histórico legado, precisão e evidência real verificados.');
} finally {
  await server.close();
}
