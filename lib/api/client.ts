const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    skipJsonContentType: boolean = false
  ): Promise<T> {
    // Get token FIRST and log it clearly
    const token = this.getToken();
    console.log('=== API REQUEST DEBUG ===');
    console.log('Endpoint:', endpoint);
    console.log('Token exists?', !!token);
    if (token) {
      console.log('Token found:', token.substring(0, 30) + '...');
    } else {
      console.warn('⚠️ No token available for request:', endpoint);
      console.warn('localStorage contents:', typeof window !== 'undefined' ? Object.keys(localStorage) : 'N/A (server-side)');
    }
    console.log('========================');
    
    // Get token FIRST and ensure it's available
    const currentToken = token;
    if (!currentToken) {
      console.warn('No token available for request:', endpoint); // Debug
    }
    
    // Build headers object - START FRESH, don't merge with options.headers
    const headers: Record<string, string> = {};
    
    // Set Content-Type only if not skipping (for FormData)
    if (!skipJsonContentType) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Add Authorization header if token exists
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
      console.log('✅ Authorization header added:', `Bearer ${currentToken.substring(0, 20)}...`); // Debug
    } else {
      console.warn('❌ No Authorization header added - token missing'); // Debug
    }
    
    // Build request options - DO NOT spread options, build from scratch
    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers: headers, // Set headers directly
      credentials: 'include',
    };
    
    // Add body if present
    if (options.body) {
      requestOptions.body = options.body;
    }
    
    // Log what we're sending
    console.log('=== FETCH REQUEST DEBUG ===');
    console.log('URL:', `${this.baseUrl}${endpoint}`);
    console.log('Method:', requestOptions.method);
    console.log('Headers object:', headers);
    console.log('Headers keys:', Object.keys(headers));
    console.log('Authorization in headers?', 'Authorization' in headers);
    console.log('Authorization value:', headers['Authorization']?.substring(0, 50) + '...');
    console.log('Request options headers:', requestOptions.headers);
    console.log('==========================');
    
    let response: Response;
    try {
      // Use fetch directly with plain object - Request object sometimes doesn't serialize headers correctly
      const url = `${this.baseUrl}${endpoint}`;
      const fetchOptions: RequestInit = {
        method: requestOptions.method,
        headers: headers, // Plain object - browser will serialize correctly
        credentials: 'include',
      };
      
      if (requestOptions.body) {
        fetchOptions.body = requestOptions.body;
      }
      
      // Final verification before fetch
      console.log('About to fetch with headers:', JSON.stringify(headers, null, 2));
      
      response = await fetch(url, fetchOptions);
    } catch (error: any) {
      // Network error (backend not running, CORS issue, etc.)
      throw new Error(`Failed to connect to server. Please make sure the backend is running. ${error.message || ''}`);
    }

    if (!response.ok) {
      // 401 Unauthorized - token might be invalid or expired
      if (response.status === 401) {
        console.warn('401 Unauthorized received. Token was:', this.getToken() ? 'present' : 'missing'); // Debug
        
        // Check if this is a login/register endpoint - don't remove token for those
        const isAuthEndpoint = endpoint.includes('/api/auth/login') || 
                               endpoint.includes('/api/auth/register') ||
                               endpoint.includes('/api/auth/verify-email') ||
                               endpoint.includes('/api/auth/resend-verification-code');
        
        // Only remove token and redirect if:
        // 1. Token exists (we had a token but it was rejected)
        // 2. It's NOT an auth endpoint (login/register/verify can fail without invalidating existing token)
        // 3. It's NOT a notification endpoint (notifications might fail for other reasons)
        // 4. It's NOT an AllowAnonymous endpoint (profile endpoints can work without auth)
        const currentToken = this.getToken();
        const isNotificationEndpoint = endpoint.includes('/api/notifications');
        // AllowAnonymous endpoints - these can work without authentication
        const isAllowAnonymousEndpoint = endpoint.includes('/api/follow/') && (
                                         endpoint.includes('/profile') || 
                                         endpoint.includes('/search') ||
                                         endpoint.includes('/followers') ||
                                         endpoint.includes('/following')
                                        );
        
        // Check if we're on a public page - never remove token on public pages
        const isPublicPage = typeof window !== 'undefined' && (
          window.location.pathname === '/discover' || 
          window.location.pathname.startsWith('/profile/')
        );
        
        if (currentToken && !isAuthEndpoint && !isNotificationEndpoint && !isAllowAnonymousEndpoint && !isPublicPage) {
          // Token exists but was rejected - might be expired or invalid
          // Try to get error details from response
          try {
            const errorData = await response.clone().json();
            // Only remove if backend explicitly says token is invalid
            if (errorData.message && (errorData.message.includes('token') || errorData.message.includes('expired'))) {
              console.warn('Removing token due to explicit backend rejection'); // Debug
              this.removeToken();
              
              // Redirect to login page if we're in the browser
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
                return undefined as any; // Prevent further execution
              }
            } else {
              console.warn('401 received but keeping token - might be endpoint-specific issue'); // Debug
            }
          } catch {
            // If response is not JSON, be conservative and keep token
            console.warn('401 received but keeping token - cannot parse error response'); // Debug
          }
        } else if (isPublicPage) {
          // On public pages, never remove token even if 401 is received
          console.log('401 on public page - keeping token'); // Debug
        } else if (!currentToken && !isAuthEndpoint && !isAllowAnonymousEndpoint) {
          // No token and not an auth endpoint or AllowAnonymous endpoint
          // Let the component handle the error message
          console.warn('401 received but no token was sent'); // Debug
          // Don't redirect - let the component show error message
        } else if (isAllowAnonymousEndpoint) {
          // AllowAnonymous endpoints can return 401 if user is not authenticated
          // This is normal - don't remove token or redirect
          console.log('401 on AllowAnonymous endpoint - this is expected for unauthenticated users'); // Debug
        }
        
        // Get error message from response if available
        let errorMessage = 'Unauthorized';
        try {
          const errorData = await response.clone().json();
          errorMessage = errorData.message || errorData.error || 'Unauthorized';
        } catch {
          // If response is not JSON, use default message
        }
        
        const error = new Error(errorMessage);
        (error as any).status = 401;
        throw error;
      }
      
      // 404 is a normal case for some endpoints (e.g., user hasn't rated yet)
      if (response.status === 404) {
        const error = new Error('Not Found');
        (error as any).status = 404;
        throw error;
      }
      
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorData: any = null;
      
      try {
        const responseText = await response.clone().text();
        console.error('Error response text:', responseText);
        
        if (responseText) {
          try {
            errorData = JSON.parse(responseText);
          } catch {
            // If not JSON, use text as message
            errorMessage = responseText;
          }
        }
        
        if (errorData) {
          // Handle RegisterResponse with errors array
          if (errorData.errors && Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.join(', ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
          
          // Add details if available
          if (errorData.details) {
            errorMessage += `\n\nDetay: ${errorData.details}`;
          } else if (errorData.innerException) {
            errorMessage += `\n\nInternal Error: ${errorData.innerException}`;
          }
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).response = { data: errorData, status: response.status };
      throw error;
    }

    // Handle 204 No Content - no body expected
    if (response.status === 204) {
      return undefined as any;
    }

    // For other successful responses, try to parse JSON
    // But handle empty responses gracefully
    try {
      const text = await response.text();
      
      // If response is empty, return undefined
      if (!text || text.trim() === '') {
        return undefined as any;
      }
      
      // Try to parse as JSON
      return JSON.parse(text);
    } catch (parseError) {
      // If JSON parsing fails and it's a successful response, 
      // it might be an empty response or non-JSON content
      if (response.status >= 200 && response.status < 300) {
        console.warn('Failed to parse JSON response, returning undefined:', parseError);
        return undefined as any;
      }
      // For error responses, re-throw the parse error
      throw parseError;
    }
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') {
      console.warn('getToken: window is undefined (server-side)'); // Debug
      return null;
    }
    
    try {
      // PRIMARY: Check 'auth_token' first (this is what login page uses)
      const authToken = localStorage.getItem('auth_token');
      if (authToken) {
        console.log('Token found: auth_token', authToken.substring(0, 20) + '...'); // Debug
        return authToken;
      }
      
      // FALLBACK: Check other possible keys
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (token) {
        console.warn('Token found in alternate key (token/accessToken). Consider migrating to auth_token'); // Debug
        console.log('Token found:', token.substring(0, 20) + '...'); // Debug
        return token;
      }
      
      // No token found
      console.warn('getToken: No token found. localStorage keys:', Object.keys(localStorage)); // Debug
      console.warn('getToken: Tried keys: auth_token, token, accessToken'); // Debug
      return null;
    } catch (error) {
      console.error('Error reading token from localStorage:', error); // Debug
      return null;
    }
  }

  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('auth_token', token);
        console.log('Token saved to localStorage'); // Debug
        // Verify it was saved
        const saved = localStorage.getItem('auth_token');
        if (!saved) {
          console.error('Token was not saved to localStorage!');
        }
      } catch (error) {
        console.error('Error saving token to localStorage:', error);
      }
    } else {
      console.warn('window is undefined, cannot save token');
    }
  }

  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async postForm<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    }, true); // Skip JSON content type for FormData
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

