/**
 * ReBAC factory. Mirrors the TokenVerifier factory: consumer projects
 * inject config at bootstrap; `getRebacAdapter()` returns the currently-
 * resolved `{ primary, shadow? }` stack based on env flags.
 *
 * When `DAUTH_OPENFGA_ENFORCE=true` AND an OpenFGA config is present,
 * primary = OpenFgaRebacAdapter. Otherwise primary = NativeRebacAdapter
 * (pass-through allow). The shadow slot lets us run OpenFGA beside native
 * without flipping the decision — useful during Part 5 soak.
 *
 * Rollback: unset `DAUTH_OPENFGA_ENFORCE` and restart. Cached state is
 * process-local.
 */
import type { RebacAdapter } from './dauth-ports/rebac.port';
import { NativeRebacAdapter } from './adapters/native-rebac.adapter';
import { OpenFgaRebacAdapter, type OpenFgaRebacOptions } from './adapters/openfga-rebac.adapter';

export interface RebacStack {
  primary: RebacAdapter;
  shadow?: RebacAdapter;
}

export interface InitRebacFactoryOptions {
  /**
   * OpenFGA config. When omitted, the factory stays in native-only mode
   * even if DAUTH_OPENFGA_ENFORCE=true — i.e. missing config is treated
   * like the flag being off. A loud warning is logged via `onMissingConfig`.
   */
  openfga?: OpenFgaRebacOptions;
  /** Optional warning callback when enforce=true but config is missing. */
  onMissingConfig?: (reason: string) => void;
}

interface FactoryState {
  native: NativeRebacAdapter | null;
  openfga: OpenFgaRebacAdapter | null;
  cached: RebacStack | null;
}

const state: FactoryState = { native: null, openfga: null, cached: null };

export function initRebacFactory(opts: InitRebacFactoryOptions = {}): void {
  state.native = new NativeRebacAdapter();
  if (opts.openfga) {
    try {
      state.openfga = new OpenFgaRebacAdapter(opts.openfga);
    } catch (err) {
      state.openfga = null;
      if (opts.onMissingConfig) {
        opts.onMissingConfig(
          `OpenFGA adapter construction failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  } else {
    state.openfga = null;
  }
  state.cached = null;
}

export function getRebacAdapter(): RebacStack {
  if (state.cached) return state.cached;
  if (!state.native) {
    throw new Error(
      '[@dos/auth] initRebacFactory() must be called before getRebacAdapter(). ' +
      'Wire it at bootstrap.',
    );
  }
  const shadow = readBool('DAUTH_OPENFGA_SHADOW');
  const enforce = readBool('DAUTH_OPENFGA_ENFORCE');

  if (enforce && state.openfga) {
    state.cached = { primary: state.openfga, shadow: shadow ? state.native : undefined };
  } else if (shadow && state.openfga) {
    state.cached = { primary: state.native, shadow: state.openfga };
  } else {
    state.cached = { primary: state.native };
  }
  return state.cached;
}

export function resetRebacFactory(): void {
  state.native = null;
  state.openfga = null;
  state.cached = null;
}

function readBool(key: string): boolean {
  const v = process.env[key];
  if (!v) return false;
  return v === '1' || v.toLowerCase() === 'true';
}
