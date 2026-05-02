import type { Router as ExpressRouter } from 'express';
import { organizationsRouter } from './organizations.routes';
import { businessUnitsRouter } from './business-units.routes';
import { positionsRouter } from './positions.routes';
import { locationsRouter } from './locations.routes';
import { orgHierarchyRouter } from './org-hierarchy.routes';
import { committeeManagementRouter } from './committee-management.routes';
import { ownershipMappingRouter } from './ownership-mapping.routes';
import { sodCheckRouter } from './sod-check.routes';
import { foundationGovernanceRouter } from './foundation-governance.routes';
import { userLifecycleRouter } from './user-lifecycle.routes';
import { bulkInviteRouter } from './bulk-invite.routes';
import { accessReviewRouter } from './access-review.routes';
import { delegationRouter } from './delegation.routes';
import { employeeLifecycleRouter } from './employee-lifecycle.routes';
import { authoritySodRouter } from './authority-sod.routes';
import { complianceFabricRouter } from './compliance-fabric.routes';
export interface FoundationAggregatorDeps {
    userRouter: ExpressRouter;
    roleRouter: ExpressRouter;
    departmentRouter: ExpressRouter;
}
export declare function createFoundationAggregatorRouter(deps: FoundationAggregatorDeps): ExpressRouter;
export { organizationsRouter, businessUnitsRouter, positionsRouter, locationsRouter, orgHierarchyRouter, committeeManagementRouter, ownershipMappingRouter, sodCheckRouter, foundationGovernanceRouter, userLifecycleRouter, bulkInviteRouter, accessReviewRouter, delegationRouter, employeeLifecycleRouter, authoritySodRouter, complianceFabricRouter, };
