'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import Link from 'next/link';

function VerifyEmailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Check for token on mount and redirect if needed for protected endpoints
  useEffect(() => {
    // This page uses [AllowAnonymous] endpoints, so token is optional
    // But we check if token exists for better UX
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token') || 
                    localStorage.getItem('token') || 
                    localStorage.getItem('accessToken');
      
      // If no token and we're trying to access a protected resource, redirect
      // For verify-email, token is not required, so we don't redirect here
      // But we log for debugging
      console.log('Token check on verify-email page:', {
        hasAuthToken: !!localStorage.getItem('auth_token'),
        hasToken: !!localStorage.getItem('token'),
        hasAccessToken: !!localStorage.getItem('accessToken'),
      });
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Email address is required.');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.verifyEmail({ email, verificationCode });
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(response.errors.join(', ') || 'Verification failed.');
      }
    } catch (err: any) {
      // Handle 401 Unauthorized - redirect to login
      if (err.status === 401) {
        router.push('/login');
        return;
      }
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Email address is required.');
      return;
    }

    setIsResending(true);
    setError('');
    setResendSuccess(false);

    try {
      const response = await authApi.resendVerificationCode({ email });
      if (response.success) {
        setResendSuccess(true);
      } else {
        setError(response.errors.join(', ') || 'Failed to resend verification code.');
      }
    } catch (err: any) {
      // Handle 401 Unauthorized - redirect to login
      if (err.status === 401) {
        router.push('/login');
        return;
      }
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-[#1C4633]/20 p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#1C4633] mb-4">Email Required</h2>
          <p className="text-gray-600 mb-6">Please provide an email address to verify.</p>
          <Link href="/register" className="text-[#1C4633] hover:text-[#DA922B] font-medium">
            Go to Registration
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center px-4 py-12">
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
          <p className="text-gray-600 mt-4">Verify your email address</p>
        </div>

        {/* Verification Form */}
        <div className="bg-white rounded-xl shadow-lg border border-[#1C4633]/20 p-8">
          <h2 className="text-2xl font-semibold text-[#1C4633] mb-2 text-center">
            Email Verification
          </h2>
          <p className="text-center text-gray-600 mb-6 text-sm">
            We've sent a verification code to <strong>{email}</strong>
          </p>

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              Email verified successfully! Redirecting to login...
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {resendSuccess && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              Verification code sent successfully!
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            {/* Verification Code Input */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-[#1C4633] mb-2">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                value={verificationCode}
                onChange={handleCodeChange}
                placeholder="000000"
                maxLength={6}
                required
                className="w-full px-4 py-3 bg-white border border-[#1C4633]/30 rounded-lg focus:ring-2 focus:ring-[#1C4633]/20 focus:border-[#1C4633] outline-none transition-all text-gray-900 placeholder-gray-400 text-center text-2xl tracking-widest font-mono"
                disabled={success || isLoading}
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Enter the 6-digit code from your email
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || success || verificationCode.length !== 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#DA922B] hover:bg-[#DA922B]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#DA922B] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-sm font-medium text-[#1C4633] hover:text-[#DA922B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isResending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center border-t border-[#1C4633]/20 pt-6">
            <Link href="/login" className="text-sm font-medium text-[#1C4633] hover:text-[#DA922B]">
              Back to Login
            </Link>
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C4633] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailPageContent />
    </Suspense>
  );
}

