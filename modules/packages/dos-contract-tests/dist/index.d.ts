/**
 * Shared DOSPort consumer contract-test suite.
 * Every consumer runs this against its bound DOSPort.
 */
import type { DOSPort } from '@dos/ports/dos';
export interface ContractTestOptions {
    readonly expectedPortsVersion?: string;
    readonly consumerName?: string;
}
export declare function runDOSPortContract(getPort: () => DOSPort, opts?: ContractTestOptions): void;
//# sourceMappingURL=index.d.ts.map