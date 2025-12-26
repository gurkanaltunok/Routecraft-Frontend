import { apiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string; // Backend returns "Token" but JSON serialization converts to "token"
  email: string;
  userId: string;
  expiresAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  userName: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  userName: string;
  success: boolean;
  errors: string[];
}

export interface VerifyEmailRequest {
  email: string;
  verificationCode: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  errors: string[];
}

export interface ResendVerificationCodeRequest {
  email: string;
}

export interface ResendVerificationCodeResponse {
  success: boolean;
  message: string;
  errors: string[];
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  errors: string[];
}

export interface VerifyResetCodeRequest {
  email: string;
  resetCode: string;
}

export interface VerifyResetCodeResponse {
  success: boolean;
  message: string;
  errors: string[];
}

export interface ResetPasswordRequest {
  email: string;
  resetCode: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  errors: string[];
}

export interface UserEmailStatusResponse {
  email: string;
  emailVerified: boolean;
}

export const authApi = {
  login: async (request: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/auth/login', request);
    console.log('=== LOGIN RESPONSE DEBUG ===');
    console.log('Full response:', JSON.stringify(response, null, 2)); // Debug
    console.log('Response type:', typeof response); // Debug
    console.log('Response keys:', response ? Object.keys(response) : 'null'); // Debug
    console.log('response.token:', response?.token); // Debug
    console.log('response.Token:', (response as any)?.Token); // Debug (case-sensitive check)
    console.log('==========================');
    
    // Try both lowercase and uppercase token property
    const token = response?.token || (response as any)?.Token;
    
    if (response && token) {
      console.log('Setting token:', token.substring(0, 20) + '...'); // Debug
      
      // Save token directly to localStorage first
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('auth_token', token);
          console.log('Token saved directly to localStorage'); // Debug
          
          // Verify immediately
          const verifyToken = localStorage.getItem('auth_token');
          console.log('Token verification:', {
            exists: !!verifyToken,
            length: verifyToken?.length || 0,
            matches: verifyToken === token,
            allKeys: Object.keys(localStorage),
          }); // Debug
          
          if (!verifyToken || verifyToken !== token) {
            console.error('CRITICAL: Token was not saved correctly!');
            console.error('Expected:', token.substring(0, 20));
            console.error('Got:', verifyToken?.substring(0, 20) || 'null');
          } else {
            console.log('✅ Token successfully saved and verified!');
          }
        } catch (error) {
          console.error('Error saving token to localStorage:', error);
        }
      }
      
      // Also call setToken for consistency
      apiClient.setToken(token);
    } else {
      console.error('❌ No token in response!', {
        response: response,
        hasToken: !!response?.token,
        hasTokenUpper: !!(response as any)?.Token,
      }); // Debug
    }
    return response;
  },

  register: async (request: RegisterRequest): Promise<RegisterResponse> => {
    return apiClient.post<RegisterResponse>('/api/auth/register', request);
  },

  verifyEmail: async (request: VerifyEmailRequest): Promise<VerifyEmailResponse> => {
    return apiClient.post<VerifyEmailResponse>('/api/auth/verify-email', request);
  },

  resendVerificationCode: async (request: ResendVerificationCodeRequest): Promise<ResendVerificationCodeResponse> => {
    return apiClient.post<ResendVerificationCodeResponse>('/api/auth/resend-verification-code', request);
  },

  getEmailStatus: async (): Promise<UserEmailStatusResponse> => {
    return apiClient.get<UserEmailStatusResponse>('/api/auth/email-status');
  },

  forgotPassword: async (request: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    return apiClient.post<ForgotPasswordResponse>('/api/auth/forgot-password', request);
  },

  verifyResetCode: async (request: VerifyResetCodeRequest): Promise<VerifyResetCodeResponse> => {
    return apiClient.post<VerifyResetCodeResponse>('/api/auth/verify-reset-code', request);
  },

  resetPassword: async (request: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    return apiClient.post<ResetPasswordResponse>('/api/auth/reset-password', request);
  },

  logout: (): void => {
    apiClient.removeToken();
  },
};



