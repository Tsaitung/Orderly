'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { InvitationDetailResponse, InvitationStatus } from '@orderly/types';
import { http } from '@/lib/api/http';

interface InvitationVerifyFormData {
  code: string;
}

export default function SupplierInvitePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<InvitationVerifyFormData>({ code: '' });
  const [invitation, setInvitation] = useState<InvitationDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleCodeChange = (value: string) => {
    // Auto-format to uppercase and limit to 8 characters
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setFormData({ code: formatted });
    setError('');
  };

  const verifyInvitation = async () => {
    if (!formData.code || formData.code.length !== 8) {
      setError('請輸入8位英數字邀請代碼');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await http.get<InvitationDetailResponse>(`/api/invitations/verify/${formData.code}`);
      setInvitation(data);
    } catch (err) {
      setError('網路錯誤，請重試');
    } finally {
      setLoading(false);
    }
  };

  const startOnboarding = () => {
    if (invitation && invitation.canBeAccepted) {
      router.push(`/auth/supplier-onboarding?code=${invitation.code}`);
    }
  };

  const getStatusIcon = (status: InvitationStatus, isExpired: boolean, canBeAccepted: boolean) => {
    if (canBeAccepted) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (isExpired) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusMessage = (status: InvitationStatus, isExpired: boolean, canBeAccepted: boolean) => {
    if (canBeAccepted) {
      return '邀請有效，可以開始註冊';
    } else if (isExpired) {
      return '邀請已過期';
    } else if (status === 'accepted') {
      return '邀請已被接受';
    } else if (status === 'cancelled') {
      return '邀請已被取消';
    }
    return '邀請無法使用';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            供應商邀請驗證
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            輸入餐廳夥伴提供的邀請代碼，開始您的數位化供應鏈之旅
          </p>
        </div>

        {!invitation ? (
          /* Invitation Code Input */
          <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
            <div>
              <Label htmlFor="code">邀請代碼</Label>
              <Input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="輸入8位英數字代碼"
                className={cn(
                  "mt-1 text-center text-lg font-mono tracking-widest",
                  error && "border-red-500"
                )}
                maxLength={8}
                autoFocus
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                邀請代碼格式：8位英數字組合（如：AB12CD34）
              </p>
            </div>

            <Button
              onClick={verifyInvitation}
              disabled={loading || formData.code.length !== 8}
              className="w-full flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>驗證邀請代碼</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Invitation Details */
          <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
            <div className="text-center">
              <div className="mb-4">
                {getStatusIcon(invitation.status as InvitationStatus, invitation.isExpired, invitation.canBeAccepted)}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                邀請詳情
              </h3>
              <p className={cn(
                "text-sm",
                invitation.canBeAccepted ? "text-green-600" : "text-red-600"
              )}>
                {getStatusMessage(invitation.status as InvitationStatus, invitation.isExpired, invitation.canBeAccepted)}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">邀請方</span>
                <span className="text-sm font-medium text-gray-900">
                  {invitation.inviterOrganizationName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">公司名稱</span>
                <span className="text-sm font-medium text-gray-900">
                  {invitation.inviteeCompanyName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">聯絡信箱</span>
                <span className="text-sm font-medium text-gray-900">
                  {invitation.inviteeEmail}
                </span>
              </div>
              {invitation.inviteeContactPerson && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">聯絡人</span>
                  <span className="text-sm font-medium text-gray-900">
                    {invitation.inviteeContactPerson}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">有效期限</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(invitation.expiresAt).toLocaleDateString('zh-TW')}
                </span>
              </div>
            </div>

            {invitation.invitationMessage && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">邀請訊息</h4>
                <p className="text-sm text-gray-600">{invitation.invitationMessage}</p>
              </div>
            )}

            <div className="space-y-3">
              {invitation.canBeAccepted ? (
                <Button
                  onClick={startOnboarding}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <span>開始註冊</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button disabled className="w-full">
                  無法進行註冊
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => setInvitation(null)}
                className="w-full"
              >
                重新輸入代碼
              </Button>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            沒有邀請代碼？請聯絡您的餐廳合作夥伴<br />
            或致電客服：02-1234-5678
          </p>
        </div>
      </div>
    </div>
  );
}
