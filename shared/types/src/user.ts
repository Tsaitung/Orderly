import { UserRole } from './common';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  type: 'restaurant' | 'supplier';
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  phone?: string;
  password: string;
}

export interface CreateOrganizationRequest {
  name: string;
  type: 'restaurant' | 'supplier';
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface InviteUserRequest {
  email: string;
  organizationId: string;
  role: UserRole;
}