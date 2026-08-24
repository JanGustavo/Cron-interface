/**
 * Validador universal de URLs de destino para Webhooks e Cron Jobs no CronFlow.
 * Suporta o maior escopo possível de URLs válidas (HTTP/HTTPS, domínios, IP, localhost, portas customizadas, query params, hashes).
 */
export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateDestinationUrl = (urlStr: string): UrlValidationResult => {
  const trimmed = urlStr ? urlStr.trim() : '';

  if (!trimmed) {
    return {
      isValid: false,
      error: 'A URL de destino é obrigatória.',
    };
  }

  try {
    const parsed = new URL(trimmed);

    // Permite estritamente HTTP e HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        isValid: false,
        error: 'A URL deve começar com http:// ou https:// (protocolos não suportados como ftp:// ou file:// são recusados).',
      };
    }

    // Garante que o hostname não é vazio (ex: "http://" sem host)
    if (!parsed.hostname) {
      return {
        isValid: false,
        error: 'A URL deve conter um domínio, IP ou nome de servidor (host) válido.',
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: 'Formato de URL inválido. Exemplo válido: https://httpbin.org/post ou http://localhost:8080/api/webhook',
    };
  }
};
