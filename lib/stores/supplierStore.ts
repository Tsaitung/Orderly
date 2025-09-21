/**
 * Zustand Store for Supplier Management
 * Provides centralized state management with optimistic updates and caching
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, persist } from 'zustand/middleware';
import {
  SupplierProfile,
  SupplierProfileUpdateRequest,
  SupplierDashboard,
  SupplierDashboardMetrics,
  SupplierCustomer,
  SupplierCustomerCreateRequest,
  OnboardingProgress,
  CustomerFilterParams,
  LoadingState,
  ErrorState
} from '../api/supplier-types';
import { supplierService, getSupplierErrorMessage } from '../api/supplier-service';

// ============================================================================
// Store Interface
// ============================================================================

interface SupplierStore {
  // Profile State
  profile: SupplierProfile | null;
  profileCache: Map<string, { data: SupplierProfile; timestamp: number }>;
  
  // Dashboard State
  dashboard: SupplierDashboard | null;
  metrics: SupplierDashboardMetrics | null;
  lastMetricsUpdate: number | null;
  
  // Customer State
  customers: SupplierCustomer[];
  customersPagination: {
    total_count: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  } | null;
  customersFilters: CustomerFilterParams;
  
  // Onboarding State
  onboarding: OnboardingProgress | null;
  
  // UI State
  loading: LoadingState;
  errors: ErrorState;
  
  // Cache settings
  cacheTimeout: number; // milliseconds
  
  // Actions
  actions: {
    // Profile Actions
    fetchProfile: (organizationId: string, forceRefresh?: boolean) => Promise<SupplierProfile>;
    updateProfile: (organizationId: string, data: SupplierProfileUpdateRequest) => Promise<SupplierProfile>;
    createProfile: (data: any) => Promise<SupplierProfile>;
    
    // Dashboard Actions
    fetchDashboard: (organizationId: string) => Promise<SupplierDashboard>;
    fetchMetrics: (organizationId: string) => Promise<SupplierDashboardMetrics>;
    refreshMetrics: (organizationId: string) => Promise<void>;
    
    // Customer Actions
    fetchCustomers: (organizationId: string, filters?: CustomerFilterParams) => Promise<void>;
    addCustomer: (organizationId: string, data: SupplierCustomerCreateRequest) => Promise<SupplierCustomer>;
    updateCustomer: (organizationId: string, customerId: string, data: Partial<SupplierCustomerCreateRequest>) => Promise<SupplierCustomer>;
    removeCustomer: (organizationId: string, customerId: string) => Promise<void>;
    setCustomersFilters: (filters: CustomerFilterParams) => void;
    
    // Onboarding Actions
    fetchOnboarding: (organizationId: string) => Promise<OnboardingProgress>;
    updateOnboardingStep: (organizationId: string, stepName: string, data: any) => Promise<OnboardingProgress>;
    completeOnboardingStep: (organizationId: string, stepName: string) => Promise<OnboardingProgress>;
    
    // Utility Actions
    clearErrors: () => void;
    setLoading: (section: keyof LoadingState, loading: boolean) => void;
    setError: (section: keyof ErrorState, error: string | null) => void;
    clearCache: () => void;
    refreshAll: (organizationId: string) => Promise<void>;
  };
}

// ============================================================================
// Initial State
// ============================================================================

const initialLoadingState: LoadingState = {
  profile: false,
  dashboard: false,
  customers: false,
  onboarding: false,
  metrics: false
};

const initialErrorState: ErrorState = {
  profile: null,
  dashboard: null,
  customers: null,
  onboarding: null,
  metrics: null
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useSupplierStore = create<SupplierStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        profile: null,
        profileCache: new Map(),
        dashboard: null,
        metrics: null,
        lastMetricsUpdate: null,
        customers: [],
        customersPagination: null,
        customersFilters: { page: 1, page_size: 20 },
        onboarding: null,
        loading: initialLoadingState,
        errors: initialErrorState,
        cacheTimeout: 5 * 60 * 1000, // 5 minutes

        actions: {
          // Profile Actions
          fetchProfile: async (organizationId: string, forceRefresh = false) => {
            const state = get();
            
            // Check cache first
            if (!forceRefresh) {
              const cached = state.profileCache.get(organizationId);
              if (cached && Date.now() - cached.timestamp < state.cacheTimeout) {
                set(draft => {
                  draft.profile = cached.data;
                });
                return cached.data;
              }
            }

            set(draft => {
              draft.loading.profile = true;
              draft.errors.profile = null;
            });

            try {
              const profile = await supplierService.getProfile(organizationId);
              
              set(draft => {
                draft.profile = profile;
                draft.profileCache.set(organizationId, { data: profile, timestamp: Date.now() });
                draft.loading.profile = false;
              });

              return profile;
            } catch (error) {
              const errorMessage = getSupplierErrorMessage(error);
              set(draft => {
                draft.loading.profile = false;
                draft.errors.profile = errorMessage;
              });
              throw error;
            }
          },

          updateProfile: async (organizationId: string, data: SupplierProfileUpdateRequest) => {
            const state = get();
            
            // Optimistic update
            const originalProfile = state.profile;
            set(draft => {
              if (draft.profile) {
                Object.assign(draft.profile, data);
              }
              draft.loading.profile = true;
              draft.errors.profile = null;
            });

            try {
              const updatedProfile = await supplierService.updateProfile(organizationId, data);
              
              set(draft => {
                draft.profile = updatedProfile;
                draft.profileCache.set(organizationId, { data: updatedProfile, timestamp: Date.now() });
                draft.loading.profile = false;
              });

              return updatedProfile;
            } catch (error) {
              // Rollback optimistic update
              set(draft => {
                draft.profile = originalProfile;
                draft.loading.profile = false;
                draft.errors.profile = getSupplierErrorMessage(error);
              });
              throw error;
            }
          },

          createProfile: async (data: any) => {
            set(draft => {
              draft.loading.profile = true;
              draft.errors.profile = null;
            });

            try {
              const profile = await supplierService.createProfile(data);
              
              set(draft => {
                draft.profile = profile;
                draft.profileCache.set(profile.organization_id, { data: profile, timestamp: Date.now() });
                draft.loading.profile = false;
              });

              return profile;
            } catch (error) {
              set(draft => {
                draft.loading.profile = false;
                draft.errors.profile = getSupplierErrorMessage(error);
              });
              throw error;
            }
          },

          // Dashboard Actions
          fetchDashboard: async (organizationId: string) => {
            set(draft => {
              draft.loading.dashboard = true;
              draft.errors.dashboard = null;
            });

            try {
              const dashboard = await supplierService.getDashboard(organizationId);
              
              set(draft => {
                draft.dashboard = dashboard;
                draft.loading.dashboard = false;
              });

              return dashboard;
            } catch (error) {
              set(draft => {
                draft.loading.dashboard = false;
                draft.errors.dashboard = getSupplierErrorMessage(error);
              });
              throw error;
            }
          },

          fetchMetrics: async (organizationId: string) => {
            set(draft => {
              draft.loading.metrics = true;
              draft.errors.metrics = null;
            });

            try {
              const metrics = await supplierService.getMetrics(organizationId);
              
              set(draft => {
                draft.metrics = metrics;
                draft.lastMetricsUpdate = Date.now();
                draft.loading.metrics = false;
              });

              return metrics;
            } catch (error) {
              set(draft => {
                draft.loading.metrics = false;
                draft.errors.metrics = getSupplierErrorMessage(error);
              });
              throw error;
            }
          },

          refreshMetrics: async (organizationId: string) => {
            const { fetchMetrics, fetchDashboard } = get().actions;
            await Promise.all([
              fetchMetrics(organizationId),
              fetchDashboard(organizationId)
            ]);
          },

          // Customer Actions
          fetchCustomers: async (organizationId: string, filters?: CustomerFilterParams) => {
            const state = get();
            const mergedFilters = { ...state.customersFilters, ...filters };

            set(draft => {
              draft.loading.customers = true;
              draft.errors.customers = null;
              draft.customersFilters = mergedFilters;
            });

            try {
              const response = await supplierService.getCustomers(organizationId, mergedFilters);
              
              set(draft => {
                draft.customers = response.customers;
                draft.customersPagination = {
                  total_count: response.total_count,
                  page: response.page,
                  page_size: response.page_size,
                  total_pages: response.total_pages,
                  has_next: response.has_next,
                  has_previous: response.has_previous
                };
                draft.loading.customers = false;
              });
            } catch (error) {
              set(draft => {
                draft.loading.customers = false;
                draft.errors.customers = getSupplierErrorMessage(error);
              });
              throw error;
            }
          },

          addCustomer: async (organizationId: string, data: SupplierCustomerCreateRequest) => {
            // Optimistic update
            const tempCustomer: SupplierCustomer = {
              id: 'temp-' + Date.now(),
              supplier_id: organizationId,
              customer_id: data.customer_id,
              relationship_type: data.relationship_type || 'active',
              credit_limit_ntd: data.credit_limit_ntd || 0,
              payment_terms_days: data.payment_terms_days || 30,
              first_order_date: undefined,
              last_order_date: undefined,
              total_orders: 0,
              total_revenue_ntd: 0,
              custom_pricing_rules: data.custom_pricing_rules || {},
              special_delivery_instructions: data.special_delivery_instructions,
              notes: data.notes,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            set(draft => {
              draft.customers.unshift(tempCustomer);
              if (draft.customersPagination) {
                draft.customersPagination.total_count += 1;
              }
            });

            try {
              const newCustomer = await supplierService.addCustomer(organizationId, data);
              
              set(draft => {
                const index = draft.customers.findIndex(c => c.id === tempCustomer.id);
                if (index !== -1) {
                  draft.customers[index] = newCustomer;
                }
              });

              return newCustomer;
            } catch (error) {
              // Rollback optimistic update
              set(draft => {
                draft.customers = draft.customers.filter(c => c.id !== tempCustomer.id);
                if (draft.customersPagination) {
                  draft.customersPagination.total_count -= 1;
                }
                draft.errors.customers = getSupplierErrorMessage(error);
              });
              throw error;
            }
          },

          updateCustomer: async (organizationId: string, customerId: string, data: Partial<SupplierCustomerCreateRequest>) => {
            const state = get();
            const originalCustomer = state.customers.find(c => c.id === customerId);
            
            // Optimistic update
            set(draft => {
              const index = draft.customers.findIndex(c => c.id === customerId);
              if (index !== -1) {
                Object.assign(draft.customers[index], data);
              }
            });

            try {
              const updatedCustomer = await supplierService.updateCustomer(organizationId, customerId, data);
              
              set(draft => {
                const index = draft.customers.findIndex(c => c.id === customerId);
                if (index !== -1) {
                  draft.customers[index] = updatedCustomer;
                }
              });

              return updatedCustomer;
            } catch (error) {
              // Rollback optimistic update
              if (originalCustomer) {
                set(draft => {
                  const index = draft.customers.findIndex(c => c.id === customerId);
                  if (index !== -1) {
                    draft.customers[index] = originalCustomer;
                  }
                });
              }
              set(draft => {
                draft.errors.customers = getSupplierErrorMessage(error);
              });
              throw error;
            }
          },

          removeCustomer: async (organizationId: string, customerId: string) => {
            const state = get();
            const originalCustomers = [...state.customers];
            
            // Optimistic update
            set(draft => {
              draft.customers = draft.customers.filter(c => c.id !== customerId);
              if (draft.customersPagination) {
                draft.customersPagination.total_count -= 1;
              }
            });

            try {
              await supplierService.removeCustomer(organizationId, customerId);
            } catch (error) {
              // Rollback optimistic update
              set(draft => {
                draft.customers = originalCustomers;
                if (draft.customersPagination) {
                  draft.customersPagination.total_count += 1;
                }
                draft.errors.customers = getSupplierErrorMessage(error);
              });
              throw error;
            }
          },

          setCustomersFilters: (filters: CustomerFilterParams) => {
            set(draft => {
              draft.customersFilters = { ...draft.customersFilters, ...filters };
            });
          },

          // Onboarding Actions
          fetchOnboarding: async (organizationId: string) => {
            set(draft => {
              draft.loading.onboarding = true;
              draft.errors.onboarding = null;
            });

            try {
              const onboarding = await supplierService.getOnboardingProgress(organizationId);
              
              set(draft => {
                draft.onboarding = onboarding;
                draft.loading.onboarding = false;
              });

              return onboarding;
            } catch (error) {
              set(draft => {
                draft.loading.onboarding = false;
                draft.errors.onboarding = getSupplierErrorMessage(error);
              });
              throw error;
            }
          },

          updateOnboardingStep: async (organizationId: string, stepName: string, data: any) => {
            try {
              const updatedOnboarding = await supplierService.updateOnboardingStep(organizationId, stepName, data);
              
              set(draft => {
                draft.onboarding = updatedOnboarding;
              });

              return updatedOnboarding;
            } catch (error) {
              set(draft => {
                draft.errors.onboarding = getSupplierErrorMessage(error);
              });
              throw error;
            }
          },

          completeOnboardingStep: async (organizationId: string, stepName: string) => {
            try {
              const updatedOnboarding = await supplierService.completeOnboardingStep(organizationId, stepName);
              
              set(draft => {
                draft.onboarding = updatedOnboarding;
              });

              return updatedOnboarding;
            } catch (error) {
              set(draft => {
                draft.errors.onboarding = getSupplierErrorMessage(error);
              });
              throw error;
            }
          },

          // Utility Actions
          clearErrors: () => {
            set(draft => {
              draft.errors = initialErrorState;
            });
          },

          setLoading: (section: keyof LoadingState, loading: boolean) => {
            set(draft => {
              draft.loading[section] = loading;
            });
          },

          setError: (section: keyof ErrorState, error: string | null) => {
            set(draft => {
              draft.errors[section] = error;
            });
          },

          clearCache: () => {
            set(draft => {
              draft.profileCache.clear();
              draft.lastMetricsUpdate = null;
            });
          },

          refreshAll: async (organizationId: string) => {
            const { fetchProfile, fetchDashboard, fetchMetrics, fetchCustomers, fetchOnboarding } = get().actions;
            const { customersFilters } = get();

            await Promise.allSettled([
              fetchProfile(organizationId, true),
              fetchDashboard(organizationId),
              fetchMetrics(organizationId),
              fetchCustomers(organizationId, customersFilters),
              fetchOnboarding(organizationId)
            ]);
          }
        }
      })),
      {
        name: 'supplier-store',
        partialize: (state) => ({
          // Only persist non-sensitive, cacheable data
          profileCache: state.profileCache,
          lastMetricsUpdate: state.lastMetricsUpdate,
          customersFilters: state.customersFilters,
          cacheTimeout: state.cacheTimeout
        })
      }
    ),
    {
      name: 'supplier-store'
    }
  )
);

// ============================================================================
// Hooks for Store Actions
// ============================================================================

export const useSupplierActions = () => useSupplierStore(state => state.actions);
export const useSupplierProfile = () => useSupplierStore(state => state.profile);
export const useSupplierDashboard = () => useSupplierStore(state => ({ dashboard: state.dashboard, metrics: state.metrics }));
export const useSupplierCustomers = () => useSupplierStore(state => ({ customers: state.customers, pagination: state.customersPagination }));
export const useSupplierOnboarding = () => useSupplierStore(state => state.onboarding);
export const useSupplierLoading = () => useSupplierStore(state => state.loading);
export const useSupplierErrors = () => useSupplierStore(state => state.errors);