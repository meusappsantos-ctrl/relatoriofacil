import { ReportTemplate, ReportData } from '../types';
import { STORAGE_KEY_TEMPLATES, STORAGE_KEY_REPORTS } from '../constants';

// Templates
export const getTemplates = (): ReportTemplate[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load templates", e);
    return [];
  }
};

export const saveTemplate = (template: ReportTemplate): void => {
  const current = getTemplates();
  const updated = [template, ...current];
  localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
};

export const deleteTemplate = (id: string): void => {
  const current = getTemplates();
  const updated = current.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
};

// Reports History
export const getReports = (): ReportData[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_REPORTS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load reports", e);
    return [];
  }
};

export const saveReport = (report: ReportData): void => {
  const current = getReports();
  // Check if report already exists (update it), otherwise add to top
  const index = current.findIndex(r => r.id === report.id);
  let updated;
  if (index >= 0) {
    updated = [...current];
    updated[index] = report;
  } else {
    updated = [report, ...current];
  }
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updated));
};

export const deleteReport = (id: string): void => {
  const current = getReports();
  const updated = current.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updated));
};

// Backup Functions
export const exportBackup = (): string => {
  const data = {
    templates: getTemplates(),
    reports: getReports(),
    backupDate: new Date().toISOString(),
    version: 1
  };
  return JSON.stringify(data, null, 2);
};

export const importBackup = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    
    // Basic validation
    if (!Array.isArray(data.templates) || !Array.isArray(data.reports)) {
      throw new Error("Invalid backup format");
    }

    // Determine strategy: Merge or Replace? 
    // Here we implement a "Smart Merge": 
    // 1. We keep existing items if they are not in the backup.
    // 2. We update items that exist in both (based on ID).
    // 3. We add new items from backup.
    
    // Process Templates
    const currentTemplates = getTemplates();
    const newTemplates = [...currentTemplates];
    
    data.templates.forEach((importedT: ReportTemplate) => {
       const index = newTemplates.findIndex(t => t.id === importedT.id);
       if (index >= 0) {
         newTemplates[index] = importedT; // Update
       } else {
         newTemplates.push(importedT); // Add
       }
    });

    // Process Reports
    const currentReports = getReports();
    const newReports = [...currentReports];
    
    data.reports.forEach((importedR: ReportData) => {
       const index = newReports.findIndex(r => r.id === importedR.id);
       if (index >= 0) {
         newReports[index] = importedR; // Update
       } else {
         newReports.push(importedR); // Add
       }
    });

    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(newTemplates));
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(newReports));
    
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};