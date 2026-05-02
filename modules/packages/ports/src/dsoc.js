"use strict";
/**
 * DSOCPort — public surface of the DSOC (Security Operations Center) platform
 * module.
 *
 * Status: Interface-only for now. DSOC module itself is bootstrapped in a
 * later session; until then, platform modules publish audit/security events
 * to the DOS event-backbone under the `dsoc.*` topic prefix, where the
 * eventual DSOC service will subscribe.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=dsoc.js.map