/**
 * Shared DSOCPort consumer contract-test suite.
 * Same idea as @dos/dauth-contract-tests.
 */
import type { DSOCPort } from '@dos/ports/dsoc';
export interface ContractTestOptions {
    readonly expectedPortsVersion?: string;
    readonly consumerName?: string;
}
export declare function runDSOCPortContract(getPort: () => DSOCPort, opts?: ContractTestOptions): void;
//# sourceMappingURL=index.d.ts.map