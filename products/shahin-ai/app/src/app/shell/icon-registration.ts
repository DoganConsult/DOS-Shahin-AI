/**
 * Shell icon registration — stub.
 * Icons registered dynamically from DB via Carbon IconService.
 */
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

export function provideShellIcons(): EnvironmentProviders {
  return makeEnvironmentProviders([]);
}
