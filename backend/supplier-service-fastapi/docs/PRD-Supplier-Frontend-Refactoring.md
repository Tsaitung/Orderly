# Product Requirements Document: Supplier Frontend Refactoring
**Version:** 1.0  
**Date:** 2025-09-20  
**Product Manager:** Claude  
**Status:** Ready for Implementation

---

## Executive Summary

This PRD defines the requirements for refactoring the supplier frontend to integrate with the completed FastAPI supplier backend service (port 3007). The refactoring focuses on Phase 1 implementation only, delivering essential supplier management features with real-time data integration while maintaining a clean, functional user experience without any placeholder buttons or features.

### Business Context
- **Current State:** Existing supplier frontend pages use hardcoded/mock data with non-functional buttons
- **Target State:** Fully functional supplier management interface with real backend integration
- **Scope:** Phase 1 - Basic supplier management (NO inventory, ERP, or automated notifications)
- **Timeline:** Immediate implementation required

---

## Product Vision & Objectives

### Vision Statement
Transform the supplier frontend from a static prototype into a fully operational business management platform that enables suppliers to efficiently manage their profile, customers, and business operations through real-time integration with backend services.

### Primary Objectives
1. **Complete Backend Integration:** Replace all mock data with real API calls to supplier service
2. **Functional Completeness:** Every button and interactive element must perform its intended function
3. **Business Logic Implementation:** Implement complete business workflows for supplier operations
4. **Real-time Data Management:** Enable CRUD operations with immediate backend persistence
5. **User Experience Excellence:** Maintain responsive, intuitive interface with proper feedback

### Success Metrics
- **Technical Metrics:**
  - 100% API integration coverage (all mock data replaced)
  - <500ms average API response time
  - 0 non-functional buttons or features
  - <2s page load time

- **Business Metrics:**
  - 100% supplier onboarding completion rate
  - <5 minutes to complete basic profile setup
  - 95% data accuracy in supplier profiles
  - <1% error rate in API operations

- **User Experience Metrics:**
  - All actions provide immediate visual feedback
  - Error messages are clear and actionable
  - Loading states for all async operations
  - Proper form validation with helpful messages

---

## Feature Requirements - Phase 1

### 1. Supplier Profile Management

#### 1.1 Profile Creation & Setup
**User Story:** As a new supplier, I want to create and configure my business profile so that restaurants can discover and work with my company.

**Functional Requirements:**
- Create supplier profile via API (`POST /api/suppliers`)
- Set delivery capacity (SMALL/MEDIUM/LARGE) with daily kg capacity
- Configure operating hours (weekday/weekend schedules)
- Define delivery zones (array of service areas)
- Set minimum order amount (NTD)
- Configure payment terms (1-180 days)
- Add quality certifications (JSON structure)
- Set contact preferences (email/phone/messaging)
- Add public description (500 char max)

**API Endpoints:**
```
POST /api/suppliers - Create new profile
GET /api/suppliers/{id} - Retrieve profile
PUT /api/suppliers/{id} - Update profile
DELETE /api/suppliers/{id} - Soft delete (deactivate)
```

**Acceptance Criteria:**
- ✓ All fields save to backend successfully
- ✓ Validation errors display inline
- ✓ Success/error toast notifications
- ✓ Auto-save draft functionality
- ✓ Profile completeness indicator

#### 1.2 Profile Dashboard
**User Story:** As a supplier, I want to view my business metrics and profile status at a glance.

**Functional Requirements:**
- Display real-time metrics from `GET /api/suppliers/{id}/dashboard`
- Show profile verification status (PENDING/VERIFIED/SUSPENDED)
- Display active customer count
- Show today's order metrics (placeholder: 0)
- Display weekly/monthly revenue (placeholder: 0.00)
- Show onboarding progress percentage

**Data Structure:**
```typescript
interface DashboardMetrics {
  today_orders: number
  today_revenue: number
  week_orders: number
  week_revenue: number
  month_orders: number
  month_revenue: number
  active_customers: number
  on_time_delivery_rate: number
  customer_satisfaction_rate: number
}
```

### 2. Supplier Onboarding Flow

#### 2.1 Onboarding Progress Tracker
**User Story:** As a new supplier, I want to track my onboarding progress and know what steps remain.

**Functional Requirements:**
- Track 5 onboarding steps via API
- Real-time progress updates (`PUT /api/suppliers/{id}/onboarding`)
- Visual progress indicators (completed/pending/current)
- Navigate directly to incomplete steps
- Calculate and display completion percentage

**Onboarding Steps:**
1. **Company Information** (auto-completed from registration)
2. **Business Documents** (upload business license, certifications)
3. **Delivery Setup** (capacity, zones, schedules)
4. **Product Categories** (select business categories)
5. **Verification** (admin review status)

**API Integration:**
```
GET /api/suppliers/{id}/onboarding - Get progress
PUT /api/suppliers/{id}/onboarding - Update step
```

#### 2.2 Step-by-Step Wizard
**User Story:** As a supplier, I want guided setup to ensure I complete all required information.

**Functional Requirements:**
- Multi-step form with validation
- Save progress at each step
- Skip optional steps
- Review summary before submission
- Edit previous steps without data loss

### 3. Customer Relationship Management

#### 3.1 Customer List Management
**User Story:** As a supplier, I want to manage my restaurant customers and their specific requirements.

**Functional Requirements:**
- List customers with pagination (`GET /api/suppliers/{id}/customers`)
- Add new customer relationships (`POST /api/suppliers/{id}/customers`)
- Update customer details (credit limits, payment terms)
- Deactivate relationships (`DELETE /api/suppliers/{id}/customers/{customer_id}`)
- Filter by relationship type (active/inactive/prospective)
- Search customers by name/ID

**Customer Data Model:**
```typescript
interface SupplierCustomer {
  customer_id: string
  relationship_type: 'active' | 'inactive' | 'prospective'
  credit_limit_ntd: number
  payment_terms_days: number
  custom_pricing_rules: object
  special_delivery_instructions: string
  total_orders: number
  total_revenue_ntd: number
}
```

#### 3.2 Customer Analytics
**User Story:** As a supplier, I want to understand customer behavior and value.

**Functional Requirements:**
- Display customer metrics (order count, revenue)
- Show last order date
- Calculate customer lifetime value
- Segment customers by order frequency
- Display credit utilization

### 4. Supplier Status Management

#### 4.1 Verification Status Display
**User Story:** As a supplier, I want to see my verification status and required actions.

**Functional Requirements:**
- Display current status badge (PENDING/VERIFIED/SUSPENDED)
- Show verification requirements checklist
- Display admin review notes (if any)
- Show verified date and verified by
- Action items for suspended accounts

### 5. Quick Actions & Navigation

#### 5.1 Quick Action Center
**User Story:** As a supplier, I want fast access to common tasks from any page.

**Functional Requirements:**
- Create new customer relationship
- Update delivery schedule
- View pending tasks
- Access help documentation
- Contact support

**All buttons must be functional with these implementations:**
- "Add Customer" → Opens modal with customer form
- "Update Schedule" → Navigate to delivery settings
- "View Orders" → Navigate to orders page (show empty state)
- "Download Reports" → Export customer list as CSV
- "Contact Support" → Open support ticket form

---

## Data Flow Requirements

### API Integration Architecture

#### Request Flow
1. **Frontend Component** → API Service Module → API Gateway (8000) → Supplier Service (3007)
2. All requests include JWT token from localStorage
3. Responses validated against TypeScript interfaces
4. Error responses trigger user-friendly notifications

#### State Management
```typescript
// Centralized supplier state
interface SupplierState {
  profile: SupplierProfile | null
  customers: SupplierCustomer[]
  onboarding: OnboardingProgress
  metrics: DashboardMetrics
  loading: Record<string, boolean>
  errors: Record<string, string>
}
```

#### Caching Strategy
- Profile data: Cache for 5 minutes
- Customer list: Cache with invalidation on CRUD
- Metrics: Real-time (no cache)
- Onboarding: Update optimistically, sync with backend

### Error Handling

#### API Error Responses
```typescript
interface ApiError {
  status: number
  error_code: string
  message: string
  details?: Record<string, any>
}
```

#### User-Facing Error Messages
- 400: "請檢查輸入資料是否正確"
- 401: "請重新登入"
- 403: "您沒有權限執行此操作"
- 404: "找不到相關資料"
- 409: "資料已存在，請檢查是否重複"
- 500: "系統錯誤，請稍後再試"

---

## Page-by-Page Functionality Breakdown

### 1. Supplier Dashboard (`/supplier`)

**Components:**
- `SupplierOverview` - Fetch real metrics via API
- `SupplierQuickActions` - All buttons functional
- `SupplierOrderStatus` - Show empty state initially
- `SupplierRevenueChart` - Display with zero data
- `SupplierCustomerInsights` - Show actual customer count
- `SupplierUpcomingDeliveries` - Show empty state

**Required API Calls:**
```typescript
// On page load
GET /api/suppliers/{id}/dashboard
GET /api/suppliers/{id}/customers?page=1&page_size=5
GET /api/suppliers/{id}/onboarding
```

### 2. Onboarding Page (`/supplier/onboarding`)

**Components:**
- Progress tracker with real percentage
- Step cards with completion status
- Navigation to incomplete steps
- Quick actions for next steps

**Required API Calls:**
```typescript
// On page load
GET /api/suppliers/{id}/onboarding
GET /api/suppliers/{id}

// On step completion
PUT /api/suppliers/{id}/onboarding
```

### 3. Customer Management (`/supplier/customers`)

**Components:**
- `CustomerStats` - Real metrics from API
- `CustomerFilters` - Functional filtering
- `CustomerList` - Paginated from backend
- `CustomerSegments` - Calculated from data

**Required API Calls:**
```typescript
// On page load
GET /api/suppliers/{id}/customers?page=1&page_size=20

// On add customer
POST /api/suppliers/{id}/customers

// On update
PUT /api/suppliers/{id}/customers/{customer_id}

// On remove
DELETE /api/suppliers/{id}/customers/{customer_id}
```

### 4. Profile Settings (`/supplier/settings`)

**Components:**
- Company information form
- Delivery configuration
- Payment settings
- Contact preferences

**Required API Calls:**
```typescript
// On page load
GET /api/suppliers/{id}

// On save
PUT /api/suppliers/{id}
```

---

## Technical Requirements

### Frontend Technologies
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript (strict mode)
- **UI Components:** Existing UI components (no changes)
- **State Management:** React Context + hooks
- **API Client:** Fetch with interceptors
- **Forms:** React Hook Form with Zod validation

### API Service Module Updates

Create new service: `/lib/api/supplier-service.ts`
```typescript
export const supplierService = {
  // Profile Management
  createProfile: (data: CreateProfileRequest) => Promise<ProfileResponse>
  getProfile: (id: string) => Promise<ProfileResponse>
  updateProfile: (id: string, data: UpdateProfileRequest) => Promise<ProfileResponse>
  deleteProfile: (id: string) => Promise<void>
  
  // Customer Management  
  getCustomers: (id: string, params: PaginationParams) => Promise<CustomerListResponse>
  addCustomer: (id: string, data: AddCustomerRequest) => Promise<CustomerResponse>
  updateCustomer: (supplierId: string, customerId: string, data: UpdateCustomerRequest) => Promise<CustomerResponse>
  removeCustomer: (supplierId: string, customerId: string) => Promise<void>
  
  // Dashboard & Metrics
  getDashboard: (id: string) => Promise<DashboardResponse>
  
  // Onboarding
  getOnboarding: (id: string) => Promise<OnboardingResponse>
  updateOnboarding: (id: string, step: string) => Promise<OnboardingResponse>
}
```

### Performance Requirements
- Initial page load: <2 seconds
- API response time: <500ms average
- Optimistic UI updates for better UX
- Implement loading skeletons
- Lazy load heavy components
- Cache static data (categories, zones)

### Security Requirements
- JWT tokens in Authorization header
- Sanitize all user inputs
- Validate data client-side and server-side
- Secure storage of sensitive data
- CSRF protection on state-changing operations

---

## User Stories Summary

### Must Have (P0)
1. ✓ As a supplier, I can create and edit my business profile
2. ✓ As a supplier, I can track my onboarding progress
3. ✓ As a supplier, I can add and manage customer relationships
4. ✓ As a supplier, I can view my dashboard metrics
5. ✓ As a supplier, I can update my delivery settings
6. ✓ As a supplier, I can see my verification status

### Should Have (P1)
1. ✓ As a supplier, I can export customer data
2. ✓ As a supplier, I can filter and search customers
3. ✓ As a supplier, I can see customer analytics
4. ✓ As a supplier, I can bulk update settings

### Nice to Have (P2) - Not in Phase 1
1. ✗ As a supplier, I can manage inventory (Phase 2)
2. ✗ As a supplier, I can integrate with ERP (Phase 3)
3. ✗ As a supplier, I can set automated notifications (Phase 2)
4. ✗ As a supplier, I can view order history (Requires order service)

---

## Implementation Checklist

### Week 1: Core Integration
- [ ] Create supplier API service module
- [ ] Implement authentication interceptor
- [ ] Create TypeScript interfaces from schemas
- [ ] Set up error handling utilities
- [ ] Implement loading/error states

### Week 2: Profile Management
- [ ] Refactor supplier dashboard with real data
- [ ] Implement profile CRUD operations
- [ ] Add form validation
- [ ] Create success/error notifications
- [ ] Test all profile endpoints

### Week 3: Customer Management
- [ ] Implement customer list with pagination
- [ ] Create add/edit customer modals
- [ ] Add customer filtering/search
- [ ] Implement customer analytics
- [ ] Test customer relationship flows

### Week 4: Onboarding & Polish
- [ ] Complete onboarding flow integration
- [ ] Add progress tracking
- [ ] Implement all quick actions
- [ ] Performance optimization
- [ ] End-to-end testing

---

## Testing Requirements

### Unit Tests
- API service functions (100% coverage)
- Form validation logic
- State management reducers
- Utility functions

### Integration Tests
- API request/response cycles
- Form submission flows
- Authentication flow
- Error handling scenarios

### E2E Tests
- Complete onboarding flow
- Profile creation and editing
- Customer management CRUD
- Dashboard data loading

### Manual Testing Checklist
- [ ] All buttons trigger appropriate actions
- [ ] Forms validate and submit correctly
- [ ] Error messages display properly
- [ ] Loading states appear during async operations
- [ ] Data persists after page refresh
- [ ] Responsive design works on mobile
- [ ] Accessibility standards met

---

## Risk Mitigation

### Technical Risks
1. **API Gateway routing issues**
   - Mitigation: Test all routes through gateway
   - Fallback: Direct service calls if needed

2. **Performance degradation**
   - Mitigation: Implement caching and pagination
   - Monitor: Add performance metrics

3. **State synchronization**
   - Mitigation: Single source of truth pattern
   - Use optimistic updates carefully

### Business Risks
1. **Incomplete data migration**
   - Mitigation: Validation before go-live
   - Provide data import tools

2. **User adoption**
   - Mitigation: Progressive rollout
   - Comprehensive help documentation

---

## Success Criteria

### Launch Readiness Checklist
- [ ] All mock data replaced with API calls
- [ ] Zero non-functional buttons
- [ ] All CRUD operations working
- [ ] Error handling implemented
- [ ] Loading states for all async operations
- [ ] Form validation with helpful messages
- [ ] Responsive design verified
- [ ] Performance metrics met
- [ ] Security review passed
- [ ] Documentation updated

### Post-Launch Monitoring
- API error rates <1%
- Page load times <2s
- User task completion >95%
- Support tickets <5 per day

---

## Appendix

### API Endpoint Reference
```
GET    /api/suppliers                 - List suppliers
POST   /api/suppliers                 - Create supplier
GET    /api/suppliers/{id}            - Get supplier
PUT    /api/suppliers/{id}            - Update supplier
DELETE /api/suppliers/{id}            - Deactivate supplier

GET    /api/suppliers/{id}/dashboard  - Get dashboard data
GET    /api/suppliers/{id}/onboarding - Get onboarding progress
PUT    /api/suppliers/{id}/onboarding - Update onboarding step
PUT    /api/suppliers/{id}/status     - Update status (admin)

GET    /api/suppliers/{id}/customers  - List customers
POST   /api/suppliers/{id}/customers  - Add customer
DELETE /api/suppliers/{id}/customers/{cid} - Remove customer
```

### Data Type Definitions
See `/backend/supplier-service-fastapi/app/schemas/supplier.py` for complete schema definitions.

### Environment Variables
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPPLIER_SERVICE_URL=http://localhost:8000/api/suppliers
```

---

**Document Status:** Complete and ready for implementation
**Next Steps:** Begin Week 1 implementation tasks
**Point of Contact:** Development Team Lead