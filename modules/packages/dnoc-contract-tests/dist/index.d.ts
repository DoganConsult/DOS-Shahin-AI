/**
 * Shared DNOCPort consumer contract-test suite.
 */
import type { DNOCPort } from '@dos/ports/dnoc';
export interface ContractTestOptions {
    readonly expectedPortsVersion?: string;
    readonly consumerName?: string;
}
export declare function runDNOCPortContract(getPort: () => DNOCPort, opts?: ContractTestOptions): void;
//# sourceMappingURL=index.d.ts.map