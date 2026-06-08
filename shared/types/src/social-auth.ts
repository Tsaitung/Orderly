export type SocialProvider = 'line' | 'google'

export type MFAMethod = 'totp' | 'sms'

export interface SocialBinding {
  provider: SocialProvider
  providerUserId?: string
  displayName?: string
  avatarUrl?: string
  linkedAt?: string | Date
  isPrimary?: boolean
}

export interface LoginWithSocialRequest {
  provider: SocialProvider
  redirectUri?: string
  redirectTo?: string
}

export interface LoginWithSocialResponse {
  success: boolean
  authorizationUrl?: string
  state?: string
  codeVerifier?: string
  message?: string
}

export interface OAuthCallbackRequest {
  provider: SocialProvider
  code: string
  state: string
  codeVerifier?: string
  redirectUri?: string
}

export interface OAuthUserProfile {
  id?: string
  email?: string
  displayName?: string
  avatarUrl?: string
  role?: string
  organizationId?: string
  organizationType?: 'restaurant' | 'supplier' | 'platform'
}

export interface OAuthCallbackResponse {
  success: boolean
  message?: string
  isNewUser?: boolean
  requiresRegistration?: boolean
  user?: OAuthUserProfile
  token?: string
  accessToken?: string
  refreshToken?: string
  oauthData?: {
    provider: SocialProvider
    providerUserId: string
    email?: string
    name?: string
    avatarUrl?: string
  }
}
