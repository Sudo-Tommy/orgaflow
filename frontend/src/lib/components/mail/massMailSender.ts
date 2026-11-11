import type { MassMailProgressEvent } from '$lib/types/mail';
import { MICROSERVICE_URL } from '$lib/services/emailService';

export interface SendMassMailParams {
  token: string;
  recipientIds: string[];
  subject: string;
  bodyTemplate: string;
  templateId?: string;
  isTest?: boolean;
  onProgress: (event: MassMailProgressEvent) => void;
}

export async function sendMassMailStream(params: SendMassMailParams): Promise<void> {
  const { token, recipientIds, subject, bodyTemplate, templateId, isTest = false, onProgress } = params;
  const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

  const response = await fetch(`${MICROSERVICE_URL}/mass-send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader
    },
    body: JSON.stringify({
      recipientIds,
      subject,
      bodyTemplate,
      templateId,
      isTest
    })
  });

  if (!response.ok || !response.body) {
    let errText = `Serverfehler: HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.error) errText = errJson.error;
    } catch {}
    throw new Error(errText);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let hasFailures = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.fatal) {
            throw new Error(data.fatal);
          }
          if (data.done) {
            break;
          }
          if (data.current !== undefined) {
            if (data.status === 'fehler') hasFailures++;
            onProgress({
              current: data.current,
              total: data.total,
              recipient: data.recipient || '',
              status: data.status || 'gesendet',
              errorMessage: data.errorMessage
            });
          }
        } catch (parseErr: any) {
          if (parseErr?.message && !parseErr.message.includes('JSON')) {
            throw parseErr;
          }
        }
      }
    }
  }

  if (isTest && hasFailures > 0) {
    throw new Error('Test-E-Mail konnte nicht zugestellt werden.');
  }
}
