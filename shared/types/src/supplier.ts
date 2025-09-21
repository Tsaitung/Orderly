/**
 * Supplier Management TypeScript Types
 * Comprehensive type definitions for supplier invitation, onboarding, and profile management
 */

// Enums
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum BusinessType {
  COMPANY = 'company',
  INDIVIDUAL = 'individual'
}

export enum OrganizationType {
  RESTAURANT = 'restaurant',
  SUPPLIER = 'supplier',
  PLATFORM = 'platform'
}

export enum OnboardingStatus {
  INVITED = 'invited',
  COMPANY_INFO = 'company_info',
  PRODUCT_CATEGORIES = 'product_categories',
  SKU_SETUP = 'sku_setup',
  PRICING_CONFIG = 'pricing_config',
  COMPLETED = 'completed'
}

// Core interfaces
export interface SupplierInvitation {
  id: string;
  code: string;
  inviterOrganizationId: string;
  inviterUserId: string;
  inviteeEmail: string;
  inviteeCompanyName: string;
  inviteeContactPerson?: string;
  inviteePhone?: string;
  status: InvitationStatus;
  sentAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedOrganizationId?: string;
  invitationMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  businessType?: BusinessType;
  taxId?: string; // 8-digit Taiwan business tax ID
  personalId?: string; // 10-character personal ID
  businessLicenseNumber?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  invitedByOrganizationId?: string;
  invitationAcceptedAt?: Date;
  onboardingStatus?: OnboardingStatus;
  onboardingProgress: Record<string, OnboardingStepData>;
  onboardingCompletedAt?: Date;
  deliveryZones: DeliveryZone[];
  productCategories: string[];
  certifications: Certification[];
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingStepData {
  completedAt: Date;
  data?: Record<string, unknown>;
}

export interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  postalCodes: string[];
  cities: string[];
  isActive: boolean;
  deliveryDays: DeliveryDay[];
  minimumOrderAmount?: number;
  deliveryFee?: number;
}

export interface DeliveryDay {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  cutoffTime: string; // Order cutoff time
}

export interface Certification {
  id: string;
  name: string;
  type: CertificationType;
  issuingAuthority: string;
  certificateNumber: string;
  issuedDate: Date;
  expiryDate?: Date;
  documentUrl?: string;
  isActive: boolean;
}

export enum CertificationType {
  ISO = 'iso',
  HACCP = 'haccp',
  HALAL = 'halal',
  ORGANIC = 'organic',
  FOOD_SAFETY = 'food_safety',
  OTHER = 'other'
}

// Request/Response types
export interface InvitationSendRequest {
  inviteeEmail: string;
  inviteeCompanyName: string;
  inviteeContactPerson?: string;
  inviteePhone?: string;
  invitationMessage?: string;
  expiresInDays?: number;
}

export interface InvitationSendResponse {
  success: boolean;
  invitationId: string;
  invitationCode: string;
  inviteeEmail: string;
  expiresAt: Date;
  message: string;
}

export interface InvitationVerifyRequest {
  code: string;
}

export interface InvitationDetailResponse {
  id: string;
  code: string;
  inviterOrganizationName: string;
  inviterOrganizationType: OrganizationType;
  inviteeEmail: string;
  inviteeCompanyName: string;
  inviteeContactPerson?: string;
  status: InvitationStatus;
  expiresAt: Date;
  invitationMessage?: string;
  isExpired: boolean;
  canBeAccepted: boolean;
}

export interface SupplierOnboardingRequest {
  invitationCode: string;
  
  // User account information
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  
  // Organization information
  organizationName: string;
  businessType: BusinessType;
  taxId?: string;
  personalId?: string;
  businessLicenseNumber?: string;
  
  // Contact information
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  address?: string;
}

export interface SupplierOnboardingResponse {
  success: boolean;
  userId: string;
  organizationId: string;
  invitationId: string;
  accessToken: string;
  refreshToken: string;
  organization: OrganizationResponse;
  message: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  type: string;
  businessType?: BusinessType;
  businessIdentifier: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  onboardingStatus?: string;
  isOnboardingComplete: boolean;
  createdAt: Date;
}

export interface SupplierProfileUpdateRequest {
  organizationName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  deliveryZones?: DeliveryZone[];
  productCategories?: string[];
  certifications?: Certification[];
}

export interface InvitationListResponse {
  success: boolean;
  data: InvitationResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InvitationResponse {
  id: string;
  code: string;
  inviterOrganizationName: string;
  inviterUserName: string;
  inviteeEmail: string;
  inviteeCompanyName: string;
  inviteeContactPerson?: string;
  inviteePhone?: string;
  status: InvitationStatus;
  sentAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  invitationMessage?: string;
}

// Validation types
export interface TaxIdValidationResult {
  isValid: boolean;
  companyName?: string;
  businessAddress?: string;
  registrationDate?: Date;
  status?: string;
  errorMessage?: string;
}

export interface PersonalIdValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

// Frontend state types
export interface SupplierInvitationState {
  invitations: SupplierInvitation[];
  currentInvitation?: SupplierInvitation;
  loading: boolean;
  error?: string;
  pagination: PaginationState;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SupplierOnboardingState {
  currentStep: OnboardingStep;
  stepData: Record<OnboardingStep, StepFormData>;
  validationErrors: Record<string, string>;
  isSubmitting: boolean;
  error?: string;
}

export enum OnboardingStep {
  VERIFY_INVITATION = 'verify_invitation',
  ACCOUNT_SETUP = 'account_setup',
  COMPANY_INFO = 'company_info',
  CONTACT_DETAILS = 'contact_details',
  BUSINESS_VERIFICATION = 'business_verification',
  DELIVERY_SETUP = 'delivery_setup',
  PRODUCT_CATEGORIES = 'product_categories',
  COMPLETION = 'completion'
}

export interface StepFormData {
  [key: string]: unknown;
}

export interface AccountSetupFormData extends StepFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface CompanyInfoFormData extends StepFormData {
  organizationName: string;
  businessType: BusinessType;
  taxId?: string;
  personalId?: string;
  businessLicenseNumber?: string;
}

export interface ContactDetailsFormData extends StepFormData {
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  address?: string;
}

export interface DeliverySetupFormData extends StepFormData {
  deliveryZones: DeliveryZone[];
  minimumOrderAmount?: number;
  deliveryPolicies?: string;
}

export interface ProductCategoriesFormData extends StepFormData {
  selectedCategories: string[];
  specialties?: string;
  certifications: Certification[];
}

// API Error types
export interface SupplierApiError {
  success: false;
  error: string;
  errorCode: string;
  details?: Record<string, unknown>;
}

// Utility types
export type SupplierApiResponse<T> = T | SupplierApiError;

export type SupplierInvitationFilter = {
  status?: InvitationStatus;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type OrganizationFilter = {
  type?: OrganizationType;
  businessType?: BusinessType;
  onboardingStatus?: OnboardingStatus;
  search?: string;
};

// Form validation schemas (for use with react-hook-form)
export interface SupplierFormValidation {
  invitationCode: {
    required: string;
    pattern: {
      value: RegExp;
      message: string;
    };
  };
  email: {
    required: string;
    pattern: {
      value: RegExp;
      message: string;
    };
  };
  password: {
    required: string;
    minLength: {
      value: number;
      message: string;
    };
  };
  taxId: {
    required?: string;
    pattern: {
      value: RegExp;
      message: string;
    };
  };
  personalId: {
    required?: string;
    pattern: {
      value: RegExp;
      message: string;
    };
  };
  phone: {
    pattern: {
      value: RegExp;
      message: string;
    };
  };
}

// Constants
export const SUPPLIER_CONSTANTS = {
  INVITATION_CODE_LENGTH: 8,
  TAX_ID_LENGTH: 8,
  PERSONAL_ID_LENGTH: 10,
  DEFAULT_INVITATION_EXPIRY_DAYS: 30,
  MIN_PASSWORD_LENGTH: 12,
  VALIDATION_PATTERNS: {
    TAX_ID: /^\d{8}$/,
    PERSONAL_ID: /^[A-Z]\d{9}$/,
    PHONE: /^(\+886|886|0)?[1-9]\d{8}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
} as const;

// Helper type guards
export const isSupplierInvitation = (obj: unknown): obj is SupplierInvitation => {
  return typeof obj === 'object' && obj !== null && 'code' in obj && 'inviteeEmail' in obj;
};

export const isOrganization = (obj: unknown): obj is Organization => {
  return typeof obj === 'object' && obj !== null && 'name' in obj && 'type' in obj;
};

export const isSupplierApiError = (obj: unknown): obj is SupplierApiError => {
  return typeof obj === 'object' && obj !== null && 'success' in obj && (obj as SupplierApiError).success === false;
};