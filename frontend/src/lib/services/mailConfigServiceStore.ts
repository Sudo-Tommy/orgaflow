import { pb } from './pocketbase';
import type { RecordModel } from 'pocketbase';

/**
 * Mail Config Service
 * 
 * Manages SMTP/IMAP configuration for users.
 * Handles encryption, validation, and persistence.
 */

export interface MailConfig extends RecordModel {
  company: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password_encrypted: string;
  imap_host: string;
  imap_port: number;
  email_address: string;
  created: string;
  updated: string;
}

export interface MailConfigInput {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string; // Plain password, will be encrypted
  imap_host: string;
  imap_port: number;
  email_address: string;
}

export function createMailConfigService() { // FIX: No change needed
  let currentConfig = $state<MailConfig | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  
  return {
    get config() {
      return currentConfig;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    get hasConfig() {
      return currentConfig !== null;
    },

    // Load existing config for current user
    async loadConfig(): Promise<MailConfig | null> {
      isLoading = true;
      error = null;
      try {
        const authData = pb.authStore.model;
        if (!authData?.id) {
          throw new Error('User not authenticated');
        }

        // Ermittelt die Firma des Nutzers
        let companyId = '';
        if (authData.company) {
            companyId = Array.isArray(authData.company) ? authData.company[0] : authData.company;
        }
        if (!companyId) return null; // Keine Firma zugewiesen

        const records = await pb.collection('userMailConfigs').getFullList<MailConfig>({
          filter: `company = "${companyId}"`,
          requestKey: null
        });

        if (records.length > 0) {
          currentConfig = records[0];
        }
        return currentConfig;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load mail config';
        console.error('[Mail Config] Load error:', err);
        return null;
      } finally {
        isLoading = false;
      }
    },

    // Save or update mail config
    async saveConfig(input: MailConfigInput): Promise<MailConfig> {
      isLoading = true;
      error = null;
      try {
        const authData = pb.authStore.model;
        if (!authData?.id) {
          throw new Error('User not authenticated');
        }

        let companyId = '';
        if (authData.company) {
            companyId = Array.isArray(authData.company) ? authData.company[0] : authData.company;
        }
        if (!companyId) {
            throw new Error('Keine Firma zugewiesen. E-Mail-Einstellungen erfordern eine Unternehmenszuordnung.');
        }

        // Validate input
        const validation = this.validateConfig(input);
        if (!validation.valid) {
          throw new Error(validation.errors.join(', '));
        }

        // Prepare data (password will be handled server-side)
        const formData = new FormData();
        formData.append('company', companyId);
        formData.append('smtp_host', input.smtp_host);
        formData.append('smtp_port', input.smtp_port.toString());
        formData.append('smtp_user', input.smtp_user);
        formData.append('smtp_password', input.smtp_password); // Server will encrypt
        formData.append('imap_host', input.imap_host);
        formData.append('imap_port', input.imap_port.toString());
        formData.append('email_address', input.email_address);

        if (currentConfig?.id) {
          // Update existing
          currentConfig = await pb.collection('userMailConfigs').update<MailConfig>(
            currentConfig.id,
            formData
          );
        } else {
          // Create new
          currentConfig = await pb.collection('userMailConfigs').create<MailConfig>(formData);
        }

        return currentConfig;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to save mail config';
        console.error('[Mail Config] Save error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    },

    // Delete mail config
    async deleteConfig(): Promise<void> {
      isLoading = true;
      error = null;
      try {
        if (!currentConfig?.id) {
          throw new Error('No config to delete');
        }

        await pb.collection('userMailConfigs').delete(currentConfig.id);
        currentConfig = null;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to delete mail config';
        console.error('[Mail Config] Delete error:', error);
        throw err;
      } finally {
        isLoading = false;
      }
    },

    // Validate config input
    validateConfig(input: Partial<MailConfigInput>) {
      const errors: string[] = [];

      if (!input.smtp_host) errors.push('SMTP Host ist erforderlich');
      if (!input.smtp_port || input.smtp_port < 1 || input.smtp_port > 65535) {
        errors.push('SMTP Port muss zwischen 1 und 65535 liegen');
      }
      if (!input.smtp_user) errors.push('SMTP Benutzer ist erforderlich');
      if (!input.smtp_password) errors.push('SMTP Passwort ist erforderlich');
      if (!input.imap_host) errors.push('IMAP Host ist erforderlich');
      if (!input.imap_port || input.imap_port < 1 || input.imap_port > 65535) {
        errors.push('IMAP Port muss zwischen 1 und 65535 liegen');
      }
      if (!input.email_address) errors.push('E-Mail-Adresse ist erforderlich');
      if (input.email_address && !input.email_address.includes('@')) {
        errors.push('Ungültige E-Mail-Adresse');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    },

    // Test connection to mail servers
    async testConnection(input: MailConfigInput): Promise<{ smtp: boolean; imap: boolean }> {
      isLoading = true;
      error = null;
      try {
        await new Promise(r => setTimeout(r, 1000));
        return { smtp: true, imap: true }; // Placeholder
      } catch (err) {
        error = err instanceof Error ? err.message : 'Connection test failed';
        console.error('[Mail Config] Test error:', error);
        return { smtp: false, imap: false };
      } finally {
        isLoading = false;
      }
    }
  };
}

// Singleton instance
let mailConfigService: ReturnType<typeof createMailConfigService>;

export function getMailConfigService() {
  if (!mailConfigService) {
    mailConfigService = createMailConfigService();
  }
  return mailConfigService;
}
function $state<T>(initialValue: T): T {
  return initialValue;
}
