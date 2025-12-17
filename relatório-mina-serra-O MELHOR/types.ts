export interface ReportTemplate {
  id: string;
  omDescription: string;
  activityExecuted: string;
  createdAt: number;
}

export enum WorkCenter {
  SC108HH = 'SC108HH',
  SC118HH = 'SC118HH',
  SC103HH = 'SC103HH',
  SC105HH = 'SC105HH',
  SC117HH = 'SC117HH',
}

export enum Team {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export interface ReportPhoto {
  uri: string;
  caption: string;
}

export interface ReportData {
  id: string;
  templateId: string;
  date: string;
  equipment: string;
  omNumber: string;
  activityType: 'Preventiva' | 'Corretiva';
  activityExecuted?: string; // Field to store edited activity text
  observations?: string; // Optional observations field
  startTime: string;
  endTime: string;
  iamoDeviation: boolean;
  iamoPeriod?: string;
  iamoReason?: string;
  isFinished: boolean;
  hasPending: boolean;
  pendingDescription?: string;
  team: Team;
  workCenter: WorkCenter;
  technicians: string;
  photos: ReportPhoto[]; // Changed from string[] to object array
}