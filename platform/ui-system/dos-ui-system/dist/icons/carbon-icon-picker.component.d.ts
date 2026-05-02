import { EventEmitter, OnInit } from '@angular/core';
import { CarbonIconAllowlistService } from './carbon-icon-allowlist.service';
import type { CarbonIconName } from '../allowlists/carbon-icons.allowlist';
interface PickerSubcategory {
    name: string;
    count: number;
    members: readonly string[];
}
interface PickerCategory {
    name: string;
    count: number;
    subcategories: readonly PickerSubcategory[];
}
/**
 * DosCarbonIconPickerComponent — workspace icon-picker built on raw IBM
 * Carbon primitives (cds-tabs, cds-search, cds-tile, ibmIcon directive).
 *
 * Behaviour:
 *   - Loads the canonical 7-category structure from
 *     carbon-icons.categories.json (fetched from upstream
 *     `categories.yml` at build/audit time).
 *   - Validates every member name through CarbonIconAllowlistService;
 *     disallowed names are filtered out (and counted in telemetry).
 *   - Search box filters across name + friendlyName + aliases.
 *   - Emits the chosen `CarbonIconName` on click.
 *
 * Use:
 *   <dos-carbon-icon-picker (iconSelected)="onPick($event)"></dos-carbon-icon-picker>
 */
export declare class DosCarbonIconPickerComponent implements OnInit {
    readonly svc: CarbonIconAllowlistService;
    ariaLabel: string;
    searchPlaceholder: string;
    readonly iconSelected: EventEmitter<CarbonIconName>;
    readonly categories: readonly PickerCategory[];
    readonly totalCount: number;
    searchModel: string;
    readonly search: import("@angular/core").WritableSignal<string>;
    readonly selected: import("@angular/core").WritableSignal<CarbonIconName>;
    readonly filteredIcons: import("@angular/core").Signal<readonly CarbonIconName[]>;
    readonly visibleCount: import("@angular/core").Signal<number>;
    allowedMembers(members: readonly string[]): readonly CarbonIconName[];
    onSearchChange(q: string): void;
    select(name: CarbonIconName): void;
    ngOnInit(): void;
}
export {};
