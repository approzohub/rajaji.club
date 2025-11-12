// Session Manager for handling persistent login sessions
export class SessionManager {
  private static readonly SESSION_KEY = 'rajaJi_session';
  private static readonly TOKEN_KEY = 'authToken';
  private static readonly USER_KEY = 'user_data';
  private static readonly LAST_ACTIVITY_KEY = 'last_activity';
  
  // Session timeout in milliseconds (24 hours)
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

  // Save session data
  static saveSession(data: {
    token: string;
    user: Record<string, unknown>;
    lastActivity: number;
  }) {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.TOKEN_KEY, data.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(this.LAST_ACTIVITY_KEY, data.lastActivity.toString());
      localStorage.setItem(this.SESSION_KEY, 'active');
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  // Load session data
  static loadSession(): {
    token: string | null;
    user: Record<string, unknown> | null;
    lastActivity: number | null;
    isValid: boolean;
  } {
    if (typeof window === 'undefined') {
      return { token: null, user: null, lastActivity: null, isValid: false };
    }

    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      const userStr = localStorage.getItem(this.USER_KEY);
      const lastActivityStr = localStorage.getItem(this.LAST_ACTIVITY_KEY);
      const sessionActive = localStorage.getItem(this.SESSION_KEY);

      if (!token || !userStr || !lastActivityStr || sessionActive !== 'active') {
        return { token: null, user: null, lastActivity: null, isValid: false };
      }

      const user = JSON.parse(userStr);
      const lastActivity = parseInt(lastActivityStr, 10);
      const now = Date.now();

      // Check if session has expired
      if (now - lastActivity > this.SESSION_TIMEOUT) {
        this.clearSession();
        return { token: null, user: null, lastActivity: null, isValid: false };
      }

      return { token, user, lastActivity, isValid: true };
    } catch (error) {
      console.error('Failed to load session:', error);
      this.clearSession();
      return { token: null, user: null, lastActivity: null, isValid: false };
    }
  }

  // Update last activity
  static updateActivity() {
    if (typeof window === 'undefined') return;

    try {
      const now = Date.now();
      localStorage.setItem(this.LAST_ACTIVITY_KEY, now.toString());
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }

  // Clear session data
  static clearSession() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.LAST_ACTIVITY_KEY);
      localStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  // Check if session is valid
  static isSessionValid(): boolean {
    const session = this.loadSession();
    return session.isValid;
  }

  // Get session age in minutes
  static getSessionAge(): number {
    const session = this.loadSession();
    if (!session.lastActivity) return 0;
    
    return Math.floor((Date.now() - session.lastActivity) / (1000 * 60));
  }

  // Extend session (called on user activity)
  static extendSession() {
    if (this.isSessionValid()) {
      this.updateActivity();
    }
  }
}

// Auto-extend session on user activity
if (typeof window !== 'undefined') {
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  const handleActivity = () => {
    SessionManager.extendSession();
  };

  activityEvents.forEach(event => {
    document.addEventListener(event, handleActivity, { passive: true });
  });
} 