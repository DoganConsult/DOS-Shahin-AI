"use strict";
/**
 * Identity port — abstracts identity resolution / provisioning from an external
 * IdP (Keycloak) so DAuth can map `keycloak_user_id → dauth_user_id` and
 * pull profile updates on login.
 *
 * DAuth keeps tenant membership, onboarding state, entitlements. The IdP only
 * owns authentication, MFA, password policy, email verification.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=identity.port.js.map