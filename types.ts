export interface User {
  email: string;
  name: string;
}

export interface AppUser {
  id: string;
  email: string | null;
  user_data: {
    first_name?: string | null;
    name?: string | null;
    company_name?: string | null;
    [key: string]: unknown;
  };
}

export interface NavItem {
  label: string;
  icon: any; // Lucide icon type
  id: string;
}

export interface StatCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: any;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  uv: number;
}

export enum AuthState {
  LOGIN,
  SIGNUP,
  AUTHENTICATED
}

export interface ActivityItem {
  id: number;
  user: string;
  action: string;
  time: string;
  avatar: string;
}

// Matrix & Delivery Shared Types
export interface ColumnConfig {
  id: string;
  name: string;
  type: 'input' | 'output' | 'custom'; // Added custom for delivery page extra columns
  nature?: 'text' | 'country_zone';
  options?: string[];
  defaultValue?: string;
}

export interface MatrixRow {
  id: string;
  [key: string]: string;
}

export interface DeliveryRow {
  id: string;
  inputs: Record<string, string>; // Maps ColumnID -> Value
  customValues: Record<string, string>; // Maps CustomColumnID -> Value
  // Outputs are calculated on the fly, not stored
}
