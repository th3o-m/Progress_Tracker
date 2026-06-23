import { supabase } from '../config/supabase.js';
import { throwDb } from '../utils/http.js';

export interface AuditEvent {
  user_id: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'generate';
  table_name: string;
  record_id: string;
  details: Record<string, unknown>;
}

export async function auditLog(event: AuditEvent): Promise<void> {
  const { error } = await supabase.from('audit_log').insert(event);
  throwDb(error);
}
