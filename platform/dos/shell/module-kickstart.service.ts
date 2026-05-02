// Re-export the canonical ModuleKickstartService implementation.
// Path resolves inside platform/dos/ — `..` reaches dos/, then `modules/`
// is dos/modules/ (the platform/dos consolidation home, not the top-level
// modules/ tier). Verified against the manifest §1.1 master ownership rule.
export { ModuleKickstartService } from '../modules/module-kickstart.service';
