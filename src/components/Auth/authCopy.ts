export const authCopy = {
  login: {
    eyebrow: 'Retome o controle das suas automações',
    title: 'Entre no seu espaço de execução.',
    description: 'Acompanhe jobs, retries, filas e alertas em um só lugar.',
    submit: 'Entrar no painel',
    switchPrompt: 'Ainda não tem uma conta?',
    switchAction: 'Criar conta grátis',
  },
  signup: {
    eyebrow: 'Comece com uma automação confiável',
    title: 'Crie seu primeiro fluxo em poucos minutos.',
    description: 'Você terá um workspace para agendar, proteger e diagnosticar suas execuções desde o primeiro job.',
    submit: 'Criar workspace grátis',
    switchPrompt: 'Já tem uma conta?',
    switchAction: 'Entrar',
    reassurance: 'Sem cartão de crédito. Comece pequeno e evolua quando sua operação exigir mais.',
  },
  forgotPassword: {
    eyebrow: 'Recuperação segura',
    title: 'Vamos devolver o acesso ao seu workspace.',
    description: 'Informe o e-mail da conta. Enviaremos as instruções para criar uma nova senha.',
    submit: 'Enviar link de recuperação',
  },
  resetPassword: {
    eyebrow: 'Acesso protegido',
    title: 'Defina uma nova senha.',
    description: 'Escolha uma senha forte para continuar protegendo suas automações.',
    submit: 'Definir nova senha',
  },
} as const;

export const authTrustNotes = [
  'Webhooks assinados com HMAC-SHA256',
  'Proteção contra destinos internos e SSRF',
  'Retries e falhas visíveis no painel',
] as const;
