import { describe, it, expect, vi } from 'vitest';
import { requireAdmin, requireSelfOrAdmin, hasAdminRole } from './ownership';
import { UserServiceError } from '../domain/contracts/user-errors';

function mkReq(user?: any, paramId?: string): any {
  return { user, params: paramId !== undefined ? { id: paramId } : {} };
}

describe('ownership middleware', () => {
  it('hasAdminRole true for admin / user_admin / super_admin', () => {
    expect(hasAdminRole(mkReq({ role: 'admin' }))).toBe(true);
    expect(hasAdminRole(mkReq({ roles: ['user_admin'] }))).toBe(true);
    expect(hasAdminRole(mkReq({ role: 'super_admin' }))).toBe(true);
  });

  it('hasAdminRole false for viewer / member', () => {
    expect(hasAdminRole(mkReq({ role: 'viewer' }))).toBe(false);
    expect(hasAdminRole(mkReq({}))).toBe(false);
    expect(hasAdminRole(mkReq())).toBe(false);
  });

  it('requireAdmin denies non-admin with UserServiceError', () => {
    const next = vi.fn();
    requireAdmin()(mkReq({ role: 'viewer' }), {} as any, next);
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toBeInstanceOf(UserServiceError);
    expect(next.mock.calls[0][0].code).toBe('UNAUTHORIZED_PROFILE_UPDATE');
  });

  it('requireAdmin passes admin through', () => {
    const next = vi.fn();
    requireAdmin()(mkReq({ role: 'admin' }), {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('requireSelfOrAdmin allows user touching own profile', () => {
    const next = vi.fn();
    requireSelfOrAdmin('id')(mkReq({ userId: 'u1', role: 'viewer' }, 'u1'), {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('requireSelfOrAdmin allows admin touching another profile', () => {
    const next = vi.fn();
    requireSelfOrAdmin('id')(mkReq({ userId: 'u1', role: 'admin' }, 'u2'), {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('requireSelfOrAdmin denies non-admin touching another profile', () => {
    const next = vi.fn();
    requireSelfOrAdmin('id')(mkReq({ userId: 'u1', role: 'viewer' }, 'u2'), {} as any, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UserServiceError);
    expect(next.mock.calls[0][0].code).toBe('UNAUTHORIZED_PROFILE_UPDATE');
  });

  it('requireSelfOrAdmin denies when no actor or target', () => {
    const next = vi.fn();
    requireSelfOrAdmin('id')(mkReq(undefined, 'u1'), {} as any, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UserServiceError);
  });

  it('requireSelfOrAdmin uses configurable param name', () => {
    const next = vi.fn();
    const req: any = { user: { userId: 'u1', role: 'viewer' }, params: { userId: 'u1' } };
    requireSelfOrAdmin('userId')(req, {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('requireAdmin denied error includes actor and reason=admin_required', () => {
    const next = vi.fn();
    const req: any = { user: { userId: 'viewer-1', role: 'viewer' }, params: {} };
    requireAdmin()(req, {} as any, next);
    const err = next.mock.calls[0][0];
    expect(err.detail).toEqual({ actor: 'viewer-1', reason: 'admin_required' });
  });

  it('requireAdmin denied error when req.user undefined includes actor=undefined', () => {
    const next = vi.fn();
    const req: any = { params: {} };
    requireAdmin()(req, {} as any, next);
    const err = next.mock.calls[0][0];
    expect(err.detail.actor).toBeUndefined();
    expect(err.detail.reason).toBe('admin_required');
  });

  it('requireSelfOrAdmin denied error carries target + actor detail', () => {
    const next = vi.fn();
    const req: any = { user: { userId: 'actor-x', role: 'viewer' }, params: { id: 'target-y' } };
    requireSelfOrAdmin('id')(req, {} as any, next);
    const err = next.mock.calls[0][0];
    expect(err.detail).toEqual({ target: 'target-y', actor: 'actor-x' });
  });

  it('hasAdminRole unions role + roles fields', () => {
    expect(hasAdminRole(mkReq({ role: 'viewer', roles: ['admin'] }))).toBe(true);
    expect(hasAdminRole(mkReq({ role: 'viewer', roles: ['guest'] }))).toBe(false);
  });
});
