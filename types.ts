export enum PriorityLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export enum IssueCategory {
  Safety = 'Safety',
  Maintenance = 'Maintenance',
  Cleanliness = 'Cleanliness',
  IT = 'IT',
  Other = 'Other'
}

export interface IssueItem {
  id: string;
  description: string;
  photo: string | null;
  comments: string;
}

export interface IssueReport {
  entryDate: string;
  projectName: string;
  frontViewPhotos?: string[]; // array of base64 encoded strings
  issues: IssueItem[];
}

export interface SuggestedInfo {
  priority: PriorityLevel;
  category: IssueCategory;
}

export interface User {
  name: string;
  email: string;
  role?: 'admin' | 'user';
  profilePicture?: string | null;
}