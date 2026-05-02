/**
 * Boot-time component publisher.
 *
 * Calls the bound Dynamic UI port to register the Compliance UI library's
 * component allowlist. Hosts call this after `bindCompliancePorts({ dynamicUi })`
 * during module installation. Idempotent at the port adapter level.
 */
import { getDynamicUiPort, type ComponentRegistration } from '../../ports/dynamic-ui.port';
import { COMPLIANCE_COMPONENT_KEYS } from '../../ui/component-registry';

export interface RegisterComponentsResult {
  count: number;
  componentKeys: string[];
}

export async function registerComplianceComponents(): Promise<RegisterComponentsResult> {
  const components: ComponentRegistration[] = COMPLIANCE_COMPONENT_KEYS.map((c) => ({
    componentKey: c.componentKey,
    moduleCode: 'compliance',
    source: 'compliance-ui-library',
  }));
  await getDynamicUiPort().registerComponents(components);
  return {
    count: components.length,
    componentKeys: components.map((c) => c.componentKey),
  };
}
