'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isAdmin, user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // If admin, redirect to admin panel, otherwise to home
      if (isAdmin) {
        router.push('/admin');
      } else {
        router.push('/');
      }
    }
  }, [isAuthenticated, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData);
      // Wait a bit for auth context to update
      setTimeout(() => {
        // Check if user is admin from token
        const token = localStorage.getItem('auth_token');
        if (token) {
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
              
              let roles: string[] = [];
              if (Array.isArray(roleClaim)) {
                roles = roleClaim;
              } else if (typeof roleClaim === 'string') {
                roles = [roleClaim];
              }
              
              if (roles.includes('Admin')) {
                router.push('/admin');
              } else {
                router.push('/');
              }
            } else {
              router.push('/');
            }
          } catch (err) {
            router.push('/');
          }
        } else {
          router.push('/');
        }
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#1C4633]/10">
            <div className="flex items-center justify-center gap-0">
              <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="RouteCraft Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-4xl font-bold mb-0">
                <span className="text-[#1C4633]">oute</span>
                <span className="text-[#DA922B]">Craft</span>
              </h1>
            </div>
          </div>
          <p className="text-gray-600 mt-4">Plan your journey, explore the world</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg border border-[#1C4633]/20 p-8">
          <h2 className="text-2xl font-semibold text-[#1C4633] mb-6 text-center">
            Welcome Back
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1C4633] mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900 placeholder-gray-400"
                placeholder="your@email.com"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1C4633] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-white border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900 placeholder-gray-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-[#1C4633] focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#1C4633] focus:ring-[#1C4633] border-[#1C4633]/30 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-[#1C4633] hover:text-[#DA922B]">
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#DA922B] hover:bg-[#DA922B]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#DA922B] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="font-medium text-[#1C4633] hover:text-[#DA922B]">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          © 2025 RouteCraft. All rights reserved.
        </p>
      </div>
    </div>
  );
}
