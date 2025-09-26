
// --- Basic & Auth Types ---
export type Role = 'admin' | 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  employeeId: string;
  designation: string;
  department: string;
  password?: string;
  role: Role;
  permissions: Permissions;
  avatar?: string;
}

export interface Permissions {
  dashboard: { view: boolean };
  projectVisit: { view: boolean; edit: boolean };
  lastVisitedProjects: { view: boolean };
  projectCase: { view: boolean; edit: boolean };
  projectCasesList: { view: boolean };
  profile: { view: boolean; edit: boolean };
  adminPanel: { view: boolean };
  materialReceive: { view: boolean; edit: boolean };
  materialReceiveList: { view: boolean };
  systemManagement_addProject: { view: boolean; edit: boolean };
  systemManagement_projectList: { view: boolean; edit: boolean };
  systemManagement_dashboardSettings: { view: boolean; edit: boolean };
  employeeProjectVisit: { view: boolean; edit: boolean };
  sealPersonProjectVisit: { view: boolean; edit: boolean };
  itResponseTimeline: { view: boolean; edit: boolean };
  erpCorrectionReport: { view: boolean; edit: boolean };
  constructionDutyAnalysis: { view: boolean; edit: boolean };
  monthlyComparisonPrecision: { view: boolean; edit: boolean };
  ssvDutyAnalysis: { view: boolean; edit: boolean };
}

// --- View & Navigation Types ---
export type View =
  | 'dashboard'
  | 'projectVisit'
  | 'profile'
  | 'lastVisitedProjects'
  | 'projectCase'
  | 'projectCasesList'
  | 'adminPanel'
  | 'materialReceive'
  | 'materialReceiveList'
  | 'systemManagement'
  | 'employeeProjectVisit'
  | 'sealPersonProjectVisit'
  | 'itResponseTimeline'
  | 'erpCorrectionReport'
  | 'constructionDutyAnalysis'
  | 'monthlyComparisonPrecision'
  | 'ssvDutyAnalysis';

export type EmployeeVisitTab = 'records' | 'departmentSummary' | 'dutyAnalysis' | 'summary';
export type MonthlyComparisonPrecisionTab = 'records' | 'departmentSummary' | 'dutyAnalysis' | 'summary';
export type SealPersonVisitTab = 'records' | 'analysis';
export type ITResponseTimelineTab = 'records' | 'analysis';
export type ERPCorrectionTab = 'records' | 'analysis';
export type ConstructionDutyAnalysisTab = 'visit' | 'material' | 'analysis';
export type SSVDutyAnalysisTab = 'records' | 'analysis';

// --- Project & Site Related Types ---
export interface Project {
  id: number;
  name: string;
  zone: string;
  address: string;
}

export interface FeaturedProject {
  image: string;
  title: string;
  location: string;
  status: string;
  completion: number;
}

export interface VisitedProject {
  id: number;
  projectName: string;
  date: string;
  zone: string;
}

export interface IssueItem {
  id: string;
  description: string;
  photos: string[];
  comments: string;
  category?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  summary?: string;
}

// --- Data Record Types ---
export interface EmployeeVisit {
  id: number;
  date: string; // YYYY-MM-DD
  visitorName: string;
  department: string;
  designation: string;
  projectName: string;
  entryTime: string; // HH:MM
  outTime: string; // HH:MM
  duration: string; // H:M:S
  remarks?: string;
}

export interface SealPersonVisit {
  id: number;
  slNo: string;
  date: string;
  salesPersonName: string;
  designation: string;
  customerName: string;
  customerId: string;
  projectName: string;
  inTime: string;
  outTime: string;
}

export interface MaterialReceiveItem {
    id: number;
    mrf: string;
    projectName: string;
    supplierName: string;
    materialName: string;
    quantity: number;
    unit: string;
    vehicle: string;
    vehicleNumber?: string;
    receivedBy: string;
    receivingDate: string;
    receivingTime: string;
    entryDate: string;
}

export interface ERPCorrectionRecord {
  id: string | number;
  officers: string;
  department: string;
  designation: string;
  projectName: string;
  documentType: string;
  trackingNumber: string;
  correctionType: string;
  entryDate: string;
  entryTime: string;
  status: string;
  completedDate?: string;
  completedTime?: string;
  oldData: string;
  newData: string;
  remarks?: string;
}

export interface ITAssignedIssue {
  id: string;
  issue: string;
  reportedAt: Date;
  assignedTo: string;
  status: 'Issue' | 'Offline';
  projectName: string;
  zone: string;
}

// --- Analysis & Reporting Types ---
export interface ReportData {
  perDay: { date: string; visitCount: number; totalDuration: number }[];
  summary: { totalVisitDays: number; totalProjectsVisited: number; grandTotalDuration: number };
  perProject: { projectName: string; visitCount: number; totalDuration: number }[];
  durationCounts: { category: string; count: number }[];
  improperVisitCount: number;
  improperVisits: EmployeeVisit[];
  dailyProjects: { date: string; projectName: string }[];
  noVisitDays: { date: string; day: string; remark: string }[];
}

// Gemini Analysis Result
export interface AnalysisResult {
    category: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    summary: string;
}
