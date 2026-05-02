export interface MfaMethodContract {
  methodId: string;
  type: 'totp' | 'sms' | 'email' | 'hardware_key' | 'backup_codes';
  enabled: boolean;
  verified: boolean;
  lastUsedAt: string | null;
}

export interface MfaEnrollmentContract {
  enrollmentId: string;
  method: MfaMethodContract['type'];
  status: 'pending' | 'verified' | 'expired';
  secret?: string;
  qrCodeUrl?: string;
  backupCodes?: string[];
}

export interface MfaChallengeContract {
  challengeId: string;
  method: MfaMethodContract['type'];
  expiresAt: string;
  attemptsRemaining: number;
}
