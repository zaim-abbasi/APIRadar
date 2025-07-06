# API Radar Security Implementation

## Overview

This document outlines the comprehensive security measures implemented in the API Radar application to prevent unauthorized access to sensitive leak data and enforce plan-based limitations.

## Security Architecture

### 1. Backend Authentication Middleware

**Location**: `backend/src/middleware/auth.ts`

**Features**:
- **Plan-based Rate Limiting**: Different limits for each user plan
  - Free/Unauthenticated: 5 requests per minute
  - Basic: 50 requests per minute  
  - Pro: 200 requests per minute
- **Authentication Header Validation**: Validates user session data
- **Security Logging**: Comprehensive logging of all access attempts
- **Rate Limit Store**: In-memory rate limiting with automatic cleanup

### 2. Plan-Based Data Limits

**Plan Limits Configuration**:
```typescript
PLAN_LIMITS = {
  free: {
    maxLeaks: 2,           // Only 2 leaks
    maxTimeRange: '7d',    // 7 days only
    canAccessFullKey: false,
    canInfiniteScroll: false
  },
  basic: {
    maxLeaks: 4,           // Only 4 leaks
    maxTimeRange: '30d',   // 30 days only
    canAccessFullKey: false,
    canInfiniteScroll: false
  },
  pro: {
    maxLeaks: Infinity,    // All leaks
    maxTimeRange: 'all',   // All time ranges
    canAccessFullKey: true,
    canInfiniteScroll: true
  }
}
```

### 3. Backend Security Measures

**Location**: `backend/src/controllers/exploreController.ts`

**Security Features**:
- **Enforced Limits**: Backend enforces plan limits regardless of frontend requests
- **Data Filtering**: Non-pro users only see recent leaks (last 30 days)
- **Sensitive Data Protection**: Full keys only accessible to Pro users
- **Time Range Enforcement**: Backend overrides invalid time range requests
- **Pagination Limits**: Infinite scroll disabled for non-pro users
- **Security Logging**: All access attempts logged with user context

### 4. Frontend Security Integration

**Location**: `lib/api.ts`

**Features**:
- **Authentication Headers**: All API requests include user session data
- **Error Handling**: Proper handling of 401, 403, and 429 responses
- **Plan Limit Awareness**: Frontend respects backend-enforced limits

### 5. Route Protection

**Location**: `backend/src/routes/leaks.ts`

**Features**:
- **Pre-handler Authentication**: All leak routes require authentication
- **Schema Validation**: Request/response schemas with proper error codes
- **Rate Limit Headers**: Proper rate limit response headers

## Security Measures by Plan

### Free/Unauthenticated Users
- **Maximum Leaks**: 2 leaks only
- **Time Range**: 7 days maximum
- **Rate Limit**: 5 requests per minute
- **Features**: No infinite scroll, no full key access
- **Data**: Only recent leaks (last 30 days)

### Basic Users
- **Maximum Leaks**: 4 leaks only
- **Time Range**: 30 days maximum
- **Rate Limit**: 50 requests per minute
- **Features**: No infinite scroll, no full key access
- **Data**: Only recent leaks (last 30 days)

### Pro Users
- **Maximum Leaks**: Unlimited
- **Time Range**: All time ranges
- **Rate Limit**: 200 requests per minute
- **Features**: Full infinite scroll, full key access
- **Data**: All leaks, all time periods

## Anti-Hacking Measures

### 1. Backend Enforcement
- **Server-side Limits**: All limits enforced on backend regardless of frontend manipulation
- **Header Validation**: Authentication headers validated on every request
- **Rate Limiting**: Prevents brute force attacks and API abuse
- **Data Filtering**: Sensitive data filtered at database level

### 2. Request Validation
- **Schema Validation**: All requests validated against schemas
- **Type Safety**: Full TypeScript implementation prevents type-based attacks
- **Input Sanitization**: All inputs validated and sanitized

### 3. Security Monitoring
- **Comprehensive Logging**: All access attempts logged with full context
- **Violation Detection**: Attempts to bypass limits are logged and blocked
- **Rate Limit Tracking**: IP and user-based rate limiting

### 4. Data Protection
- **Sensitive Data Filtering**: Full keys only accessible to authorized users
- **Plan-based Access**: Different data sets for different user plans
- **Time-based Restrictions**: Non-pro users limited to recent data only

## Implementation Details

### Authentication Flow
1. Frontend sends user session data in headers
2. Backend validates authentication headers
3. Backend applies plan-based limits
4. Backend filters data based on user plan
5. Backend logs all access attempts
6. Frontend receives limited data based on plan

### Rate Limiting
- **In-memory Store**: Fast rate limiting with automatic cleanup
- **Plan-based Limits**: Different limits for different user types
- **IP-based Fallback**: Rate limiting by IP for unauthenticated users
- **Automatic Cleanup**: Rate limit data cleaned up every minute

### Error Handling
- **401 Unauthorized**: Invalid authentication
- **403 Forbidden**: Insufficient plan level
- **429 Too Many Requests**: Rate limit exceeded
- **Proper Error Messages**: Clear error messages for users

## Security Testing

### Test Cases
1. **Unauthenticated Access**: Should be limited to 2 leaks
2. **Basic Plan Access**: Should be limited to 4 leaks
3. **Pro Plan Access**: Should have unlimited access
4. **Rate Limiting**: Should block excessive requests
5. **Full Key Access**: Should only work for Pro users
6. **Time Range Bypass**: Should be blocked for non-pro users

### Monitoring
- **Access Logs**: All API access logged with user context
- **Violation Logs**: Attempts to bypass limits logged
- **Rate Limit Logs**: Rate limit violations logged
- **Error Logs**: All errors logged with full context

## Production Recommendations

1. **Use Redis**: Replace in-memory rate limiting with Redis
2. **Add HTTPS**: Ensure all communication is encrypted
3. **Add WAF**: Implement Web Application Firewall
4. **Add Monitoring**: Implement real-time security monitoring
5. **Add Alerts**: Set up alerts for security violations
6. **Regular Audits**: Conduct regular security audits

## Conclusion

This implementation provides comprehensive security measures that:
- ✅ Enforces plan-based limits on the backend
- ✅ Prevents unauthorized access to sensitive data
- ✅ Implements rate limiting to prevent abuse
- ✅ Logs all access attempts for monitoring
- ✅ Protects against common attack vectors
- ✅ Provides clear error messages for users

The security measures are implemented at multiple layers (frontend, backend, database) to ensure comprehensive protection against unauthorized access and data exfiltration. 