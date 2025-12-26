'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, LoginRequest, RegisterRequest } from '@/lib/api/auth';

interface User {
  userId: string;
  email: string;
  roles?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const isAdmin = user?.roles?.includes('Admin') ?? false;

  useEffect(() => {
    // Check if user is already logged in
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    console.log('AuthContext init - Token exists?', !!token); // Debug
    
    if (token) {
      // Decode token to get user info
      try {
        // JWT token has 3 parts: header.payload.signature
        const parts = token.split('.');
        if (parts.length === 3) {
          // Decode payload (add padding if needed)
          let payload = parts[1];
          payload = payload.replace(/-/g, '+').replace(/_/g, '/');
          while (payload.length % 4) {
            payload += '=';
          }
          const decoded = JSON.parse(atob(payload));
          
          // Get user ID from various possible claim names
          const userId = decoded.sub || 
                        decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
                        decoded.nameidentifier ||
                        '';
          
          // Get email
          const email = decoded.email || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '';
          
          // Get roles
          const roleClaim = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                           decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'] ||
                           decoded.role ||
                           decoded.roles;
          
          let roles: string[] = [];
          if (Array.isArray(roleClaim)) {
            roles = roleClaim;
          } else if (typeof roleClaim === 'string') {
            roles = [roleClaim];
          }
          
          if (userId) {
            console.log('AuthContext: Setting user from token', { userId, email, roles }); // Debug
            setUser({
              userId,
              email,
              roles,
            });
          } else {
            console.warn('AuthContext: Token exists but no userId found in claims'); // Debug
          }
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        console.warn('Token decode failed, but keeping token in localStorage for now'); // Debug
        // Don't remove token immediately - might be a decode issue, not an invalid token
        // Only remove if we're absolutely sure it's invalid
        // Token will be validated by backend anyway
      }
    } else {
      console.warn('AuthContext: No token found in localStorage'); // Debug
    }
    
    console.log('AuthContext: Setting isLoading to false'); // Debug
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authApi.login(credentials);
      // Token is already saved by authApi.login
      // Verify token was saved
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        console.error('CRITICAL: Token was not saved after login!');
        throw new Error('Failed to save authentication token');
      }
      console.log('Login successful, token verified in localStorage'); // Debug
      
      // Decode token to get roles
      let roles: string[] = [];
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          let payload = parts[1];
          payload = payload.replace(/-/g, '+').replace(/_/g, '/');
          while (payload.length % 4) {
            payload += '=';
          }
          const decoded = JSON.parse(atob(payload));
          const roleClaim = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                           decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'] ||
                           decoded.role ||
                           decoded.roles;
          if (Array.isArray(roleClaim)) {
            roles = roleClaim;
          } else if (typeof roleClaim === 'string') {
            roles = [roleClaim];
          }
        }
      } catch (err) {
        console.error('Error decoding roles from token:', err);
      }
      
      // Set user state from response
      setUser({
        userId: response.userId,
        email: response.email,
        roles,
      });
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      if (!response.success) {
        throw new Error(response.errors.join(', '));
      }
      // Don't auto-login, user needs to verify email first
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  // Check both user state and token for authentication
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


