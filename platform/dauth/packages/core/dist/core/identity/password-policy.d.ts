export declare const PASSWORD_MIN_LENGTH = 8;
export declare const PASSWORD_MAX_LENGTH = 128;
export declare const PASSWORD_RE: RegExp;
export declare const PASSWORD_POLICY_DESCRIPTION = "Password must be 8\u2013128 characters and include uppercase, lowercase, digit, and special character";
export declare function validatePassword(password: string): {
    valid: boolean;
    reason?: string;
};
