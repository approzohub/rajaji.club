# Session Management System

This document explains how the session management system works to prevent automatic logouts and maintain user sessions until they explicitly logout.

## Overview

The session management system ensures that users remain logged in until they explicitly click the logout button, even if there are network issues or temporary server problems.

## Key Features

### 1. Persistent Session Storage
- Sessions are stored in localStorage with multiple keys for redundancy
- Session data includes token, user info, and last activity timestamp
- 24-hour session timeout (configurable)

### 2. Activity Tracking
- Tracks user activity (mouse, keyboard, touch, scroll)
- Automatically extends session on user interaction
- Updates last activity timestamp on any user action

### 3. Network Error Handling
- Keeps users logged in during network issues
- Only logs out on clear authentication errors (401, token expired)
- Graceful handling of temporary server problems

### 4. Periodic Token Validation
- Validates token every 5 minutes when user is logged in
- Validates token when user returns to the app (visibility change)
- Non-blocking validation that doesn't interrupt user experience

## Components

### SessionManager (`src/lib/session-manager.ts`)
Handles session persistence and validation:

```typescript
// Save session data
SessionManager.saveSession({
  token: "jwt_token",
  user: userData,
  lastActivity: Date.now()
});

// Load session data
const session = SessionManager.loadSession();

// Check if session is valid
const isValid = SessionManager.isSessionValid();

// Update activity
SessionManager.updateActivity();

// Clear session
SessionManager.clearSession();
```

### Auth Store (`src/store/auth-store.ts`)
Enhanced with session management:

- **Login**: Saves session data on successful login
- **Logout**: Clears session data on explicit logout
- **Token Validation**: Uses session data as fallback
- **Activity Tracking**: Updates last activity timestamp

### Auth Provider (`src/components/auth-provider.tsx`)
Manages session lifecycle:

- **Initialization**: Loads session on app start
- **Periodic Validation**: Validates token every 5 minutes
- **Activity Tracking**: Monitors user activity
- **Visibility Change**: Validates token when user returns to app

## Session Flow

### 1. Login Process
```
User Login → API Call → Save Token → Save Session Data → Set Activity Timestamp
```

### 2. Session Validation
```
App Start → Load Session → Check Validity → Validate Token → Update Activity
```

### 3. Activity Tracking
```
User Action → Update Activity → Extend Session → Continue User Experience
```

### 4. Logout Process
```
User Logout → Clear Token → Clear Session Data → Reset State
```

## Error Handling

### Network Errors
- **API Timeout**: Keep user logged in, retry later
- **Server Error**: Keep user logged in, show error message
- **Connection Lost**: Keep user logged in, retry when connection restored

### Authentication Errors
- **401 Unauthorized**: Clear session, redirect to login
- **Token Expired**: Clear session, redirect to login
- **Invalid Token**: Clear session, redirect to login

## Configuration

### Session Timeout
```typescript
// In session-manager.ts
private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
```

### Token Validation Interval
```typescript
// In auth-provider.tsx
setInterval(validateToken, 5 * 60 * 1000); // 5 minutes
```

### Activity Events
```typescript
// Events that trigger activity tracking
const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
```

## Benefits

1. **No Automatic Logouts**: Users stay logged in until they explicitly logout
2. **Network Resilience**: Handles temporary network issues gracefully
3. **Better UX**: Seamless experience without interruption
4. **Security**: Still validates tokens and handles real authentication errors
5. **Performance**: Non-blocking validation that doesn't affect user experience

## Troubleshooting

### User Still Getting Logged Out
1. Check browser localStorage is enabled
2. Verify session timeout configuration
3. Check for 401 responses from API
4. Review network error handling

### Session Not Persisting
1. Check localStorage permissions
2. Verify session data is being saved
3. Check for JavaScript errors in console
4. Review session validation logic

### Performance Issues
1. Reduce token validation frequency
2. Optimize activity tracking events
3. Review session data size
4. Check for memory leaks

## Best Practices

1. **Always validate tokens**: Even with session persistence
2. **Handle network errors gracefully**: Don't logout on temporary issues
3. **Track user activity**: Extend sessions on user interaction
4. **Clear sessions properly**: On logout and authentication errors
5. **Monitor session health**: Log session issues for debugging 