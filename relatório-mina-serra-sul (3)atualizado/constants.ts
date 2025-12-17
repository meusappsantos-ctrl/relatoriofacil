import { Team, WorkCenter } from './types';

export const TEAMS = Object.values(Team);
export const WORK_CENTERS = Object.values(WorkCenter);

export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
};

// Key for local storage
export const STORAGE_KEY_TEMPLATES = 'mina_reports_templates';
export const STORAGE_KEY_DRAFTS = 'mina_reports_drafts';
export const STORAGE_KEY_REPORTS = 'mina_reports_history';
export const STORAGE_KEY_USER = 'mina_reports_user_creds';
export const STORAGE_KEY_SESSION = 'mina_reports_session_active';