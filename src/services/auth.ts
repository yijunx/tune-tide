const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface User {
  id: number;
  email: string;
  name: string;
  picture_url?: string;
  is_admin: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      if (userStr) {
        this.user = JSON.parse(userStr);
      }
    }
  }

  // Get stored token
  getToken(): string | null {
    return this.token;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.user;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.user?.is_admin || false;
  }

  // Initiate Google OAuth login
  login(): void {
    window.location.href = `${API_BASE}/auth/google`;
  }

  // Handle auth callback
  async handleAuthCallback(token: string): Promise<User> {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get user info');
      }

      const user = await response.json();
      
      // Store token and user info
      this.token = token;
      this.user = user;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      }

      return user;
    } catch (error) {
      console.error('Auth callback error:', error);
      throw error;
    }
  }

  // Logout
  logout(): void {
    this.token = null;
    this.user = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }

  // Make authenticated API request
  async authenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.token) {
      throw new Error('No authentication token');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Check if token is still valid
  async validateToken(): Promise<boolean> {
    if (!this.token) {
      return false;
    }

    try {
      const response = await this.authenticatedRequest(`${API_BASE}/auth/me`);
      if (response.ok) {
        const user = await response.json();
        this.user = user;
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_user', JSON.stringify(user));
        }
        return true;
      }
    } catch (error) {
      console.error('Token validation error:', error);
    }

    // Token is invalid, clear it
    this.logout();
    return false;
  }
}

// Create singleton instance
export const authService = new AuthService(); 