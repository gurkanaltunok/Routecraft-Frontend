'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: '#F4F4F2',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 15px -3px rgba(132, 87, 87, 0.1)',
            border: '1px solid rgba(28, 70, 51, 0.2)',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1C4633',
              marginBottom: '1rem'
            }}>
              An Error Occurred
            </h2>
            <p style={{
              color: '#4B5563',
              marginBottom: '1.5rem'
            }}>
              {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#DA922B',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

