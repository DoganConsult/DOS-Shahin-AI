/**
 * @dos/ports — public port interfaces for the four DOS platform modules.
 *
 * This package contains ONLY type declarations. No runtime code. Every
 * cross-module interaction between DOS, DAuth, DSOC, DNOC, or any product
 * goes through an interface declared here. Concrete implementations live
 * inside the respective module packages.
 */

export * from './dos';
export * from './dauth';
export * from './dsoc';
export * from './dnoc';
export * from './version';
