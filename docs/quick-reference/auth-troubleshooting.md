# 认证问题快速排查

## 常见错误

### 401 Unauthorized

**错误信息**：`Failed to create match: Error: 401: {"error":"Invalid token"}`

**快速诊断**：

```bash
# 1. 在浏览器控制台获取 token
localStorage.getItem('auth_token')

# 2. 运行诊断工具
npm run diagnose:auth <your_token>
```

**常见原因**：
- ✅ Token 过期（30 天未登录）
- ✅ localStorage 被清除
- ✅ JWT_SECRET 不一致
- ✅ Token 格式错误

**快速解决**：

```javascript
// 在浏览器控制台执行
localStorage.removeItem('auth_token');
localStorage.removeItem('auth_user');
location.reload();
```

### 403 Forbidden

**错误信息**：`You do not have permission to create a room`

**原因**：用户权限不足

**解决**：检查用户角色和权限配置

### Network Error

**错误信息**：`Unable to connect to the game service`

**原因**：
- 游戏服务器未启动
- CORS 配置错误
- 代理配置错误

**解决**：
1. 检查服务器是否运行：`npm run dev`
2. 检查 CORS 配置：`.env` 中的 `WEB_ORIGINS`
3. 检查代理配置：`vite.config.ts` 中的 `proxy`

## 诊断工具

### 检查 JWT 配置

```bash
npm run check:jwt
```

检查 JWT_SECRET 是否一致。

### 验证 Token

```bash
npm run debug:token <your_token>
```

验证 token 格式、签名、过期时间。

### 完整诊断

```bash
npm run diagnose:auth <your_token>
```

执行完整的认证诊断。

## 预防措施

### 1. 监控 Token 有效期

在 `AuthContext` 中添加：

```typescript
useEffect(() => {
    if (!token) return;
    
    const decoded = jwt.decode(token);
    if (decoded?.exp) {
        const remainingDays = Math.floor(
            (decoded.exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        if (remainingDays < 7) {
            console.warn('Token 即将过期');
            // 触发刷新
        }
    }
}, [token]);
```

### 2. 自动刷新

确保 `useTokenRefresh` 正常工作：
- Token 过期前自动刷新
- 刷新失败时提示重新登录
- 跨标签页同步

### 3. 友好的错误提示

```typescript
catch (error) {
    if (error.message.includes('401')) {
        toast.error('登录已过期，请重新登录');
        navigate('/login');
    }
}
```

## 常见问题

### Q: 为什么刚登录就提示过期？

A: 可能原因：
1. 服务器时间不同步
2. JWT_SECRET 不一致
3. Token 签发配置错误

### Q: 为什么有时能创建房间，有时不能？

A: 可能原因：
1. Token 在临界点过期
2. 多标签页 token 未同步
3. Refresh token 请求失败

### Q: 如何延长 Token 有效期？

A: 修改 `apps/api/src/modules/auth/auth.service.ts`：

```typescript
const JWT_EXPIRES_IN = '90d'; // 改为 90 天
```

注意：延长有效期会增加安全风险。

## 相关文档

- [完整排查指南](../troubleshooting/token-expiration.md)
- [诊断证据](../../evidence/_shared/token-expiration-diagnosis.md)
