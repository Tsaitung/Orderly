'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Smartphone, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AuthValidation, type LoginFormData } from '@/lib/validation/auth-schemas';
import { SecureStorage } from '@/lib/secure-storage';
import { http } from '@/lib/api/http';

// Using typed form data from validation schema
type LoginForm = LoginFormData;

interface MFAForm {
  code: string;
  mfaSessionId: string;
}

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<'login' | 'mfa'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [mfaForm, setMFAForm] = useState<MFAForm>({
    code: '',
    mfaSessionId: '',
  });

  const [mfaMethod, setMFAMethod] = useState<string>('');

  const updateLoginForm = (field: keyof LoginForm, value: string | boolean) => {
    setLoginForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const updateMFAForm = (field: keyof MFAForm, value: string) => {
    setMFAForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateLogin = (): boolean => {
    const validation = AuthValidation.validateLogin(loginForm)
    
    if (!validation.success) {
      setErrors(validation.errors)
      return false
    }
    
    setErrors({})
    return true
  };

  const validateMFA = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!mfaForm.code) newErrors.code = '請輸入驗證碼';
    else if (mfaForm.code.length !== 6) newErrors.code = '驗證碼應為 6 位數';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setIsLoading(true);
    try {
      const result = await login(loginForm)
      
      if (result.success) {
        // Login successful, redirect based on user role
        const storedData = SecureStorage.getTokens()
        if (storedData) {
          let redirectPath = '/dashboard';
          if (storedData.role === 'platform_admin') {
            redirectPath = '/platform';
          } else if (storedData.role.startsWith('supplier_')) {
            redirectPath = '/supplier';
          } else if (storedData.role.startsWith('restaurant_')) {
            redirectPath = '/restaurant';
          }
          router.push(redirectPath);
        }
      } else {
        setErrors({ submit: result.error || '登入失敗，請檢查您的帳號密碼' });
      }
    } catch (error) {
      setErrors({ submit: '網路錯誤，請重試' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMFA()) return;

    setIsLoading(true);
    try {
      const data = await http.post<{ data: { accessToken: string; refreshToken: string } }>(
        '/api/users/auth/verify-mfa',
        {
          email: loginForm.email,
          code: mfaForm.code,
          mfaSessionId: mfaForm.mfaSessionId,
          rememberMe: loginForm.rememberMe,
        }
      );

      if (data?.data?.accessToken && data?.data?.refreshToken) {
        // MFA verification successful
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        window.location.href = '/dashboard';
      } else {
        setErrors({ submit: 'MFA 驗證失敗，請重試' });
      }
    } catch (error) {
      setErrors({ submit: '網路錯誤，請重試' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-6">
      <div>
        <Label htmlFor="email">電子信箱</Label>
        <Input
          id="email"
          type="email"
          value={loginForm.email}
          onChange={(e) => updateLoginForm('email', AuthValidation.sanitizeString(e.target.value))}
          placeholder="your.email@company.com"
          className={errors.email ? 'border-red-500' : ''}
          disabled={isLoading}
          autoComplete="email"
        />
        {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
      </div>

      <div>
        <Label htmlFor="password">密碼</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={loginForm.password}
            onChange={(e) => updateLoginForm('password', e.target.value)}
            placeholder="輸入您的密碼"
            className={errors.password ? 'border-red-500 pr-12' : 'pr-12'}
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="rememberMe"
            checked={loginForm.rememberMe}
            onCheckedChange={(checked) => updateLoginForm('rememberMe', checked as boolean)}
          />
          <Label htmlFor="rememberMe" className="text-sm text-gray-600">
            記住我
          </Label>
        </div>

        <Link
          href="/forgot-password"
          className="text-sm text-primary-600 hover:text-primary-500 font-medium"
        >
          忘記密碼？
        </Link>
      </div>

      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? '登入中...' : '登入'}
      </Button>
    </form>
  );

  const renderMFAForm = () => (
    <div className="space-y-6">
      {/* MFA Header */}
      <div className="text-center">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {mfaMethod === 'totp' ? (
            <Smartphone className="w-6 h-6 text-primary-600" />
          ) : (
            <Shield className="w-6 h-6 text-primary-600" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          多重身份驗證
        </h3>
        <p className="text-sm text-gray-600">
          {mfaMethod === 'totp' 
            ? '請開啟您的驗證器應用程式，並輸入 6 位數驗證碼'
            : '請輸入發送到您裝置的驗證碼'
          }
        </p>
      </div>

      <form onSubmit={handleMFAVerification} className="space-y-6">
        <div>
          <Label htmlFor="mfaCode">驗證碼</Label>
          <Input
            id="mfaCode"
            type="text"
            value={mfaForm.code}
            onChange={(e) => updateMFAForm('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className={`text-center text-lg tracking-widest ${errors.code ? 'border-red-500' : ''}`}
            maxLength={6}
            disabled={isLoading}
          />
          {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code}</p>}
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? '驗證中...' : '驗證並登入'}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setStep('login')}
            disabled={isLoading}
          >
            返回登入
          </Button>
        </div>
      </form>

      {/* Help text */}
      <div className="text-center text-xs text-gray-500">
        {mfaMethod === 'totp' && (
          <p>
            找不到驗證器？請聯絡技術支援<br />
            或使用備份驗證碼
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {step === 'login' ? '登入井然平台' : '身份驗證'}
        </h1>
        <p className="text-gray-600">
          {step === 'login' 
            ? '歡迎回來！請登入您的帳戶' 
            : '為了確保帳戶安全，請完成多重身份驗證'
          }
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        {step === 'login' ? renderLoginForm() : renderMFAForm()}
      </div>

      {/* Footer */}
      {step === 'login' && (
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            還沒有帳戶？{' '}
            <Link href="/register" className="text-primary-600 hover:text-primary-500 font-medium">
              立即註冊
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
