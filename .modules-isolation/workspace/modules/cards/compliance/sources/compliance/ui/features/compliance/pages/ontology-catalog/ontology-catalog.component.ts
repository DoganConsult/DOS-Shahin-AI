import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ApiClientService } from "@app/core/services/api-client.service";
import { ButtonModule, DialogModule, DropdownModule, InputModule, TableModule, TabsModule, TagModule, TilesModule } from 'carbon-components-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ontology-catalog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    TilesModule, TabsModule, TableModule, TagModule, ButtonModule,
    DialogModule, InputModule, InputModule, DropdownModule
  ],
  template: `
    <app-page-shell icon="sitemap" [title]="i18n.translate('grcOs.ontologyCatalog')"
      [subtitle]="i18n.translate('ontologyCatalog.subtitle')"
      [breadcrumbs]="['Dashboard', 'Ontology Catalog']" [loading]="loading">
      <cds-tabs>
        <!-- Sectors Tab -->
        <cds-tab [header]="i18n.translate('ontologyCatalog.sectors')">
          <div class="mb-3">
            <button cdsButton [label]="i18n.translate('ontologyCatalog.addSector')" icon="" (onClick)="openDialog('sector')" />
          </div>
          <table cdsTable aria-label="Sectors table" [value]="sectors" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>{{ i18n.translate('ontologyCatalog.name') }}</th><th>{{ i18n.translate('ontologyCatalog.nameAr') }}</th><th>{{ i18n.translate('ontologyCatalog.status') }}</th><th>{{ i18n.translate('ontologyCatalog.actions') }}</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name_en || item.name }}</td>
                <td>{{ item.name_ar }}</td>
                <td><cds-tag [value]="item.status || 'active'" [severity]="item.status === 'inactive' ? 'danger' : 'success'" /></td>
                <td>
                  <button cdsButton icon="" [text]="true" severity="info" (onClick)="editItem('sector', item)" />
                  <button cdsButton icon="" [text]="true" severity="danger" (onClick)="deleteItem('sector', item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="4" class="text-center p-4">
                <i class="" style="font-size:1.5rem; display:block; margin-bottom:8px"></i>
                {{ i18n.translate('ontologyCatalog.noData') }}
              </td></tr>
            </ng-template>
          </table>
        </cds-tab>

        <!-- Subsectors Tab -->
        <cds-tab [header]="i18n.translate('ontologyCatalog.subsectors')">
          <div class="mb-3">
            <button cdsButton [label]="i18n.translate('ontologyCatalog.addSubsector')" icon="" (onClick)="openDialog('subsector')" />
          </div>
          <table cdsTable aria-label="Subsectors table" [value]="subsectors" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>{{ i18n.translate('ontologyCatalog.name') }}</th><th>{{ i18n.translate('ontologyCatalog.parentSector') }}</th><th>{{ i18n.translate('ontologyCatalog.status') }}</th><th>{{ i18n.translate('ontologyCatalog.actions') }}</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name_en || item.name }}</td>
                <td>{{ item.sector_name || item.sector_id }}</td>
                <td><cds-tag [value]="item.status || 'active'" [severity]="item.status === 'inactive' ? 'danger' : 'success'" /></td>
                <td>
                  <button cdsButton icon="" [text]="true" severity="info" (onClick)="editItem('subsector', item)" />
                  <button cdsButton icon="" [text]="true" severity="danger" (onClick)="deleteItem('subsector', item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="4" class="text-center p-4">{{ i18n.translate('ontologyCatalog.noData') }}</td></tr>
            </ng-template>
          </table>
        </cds-tab>

        <!-- Regulators Tab -->
        <cds-tab [header]="i18n.translate('ontologyCatalog.regulators')">
          <div class="mb-3">
            <button cdsButton [label]="i18n.translate('ontologyCatalog.addRegulator')" icon="" (onClick)="openDialog('regulator')" />
          </div>
          <table cdsTable aria-label="Regulators table" [value]="regulators" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>{{ i18n.translate('ontologyCatalog.name') }}</th><th>{{ i18n.translate('ontologyCatalog.country') }}</th><th>{{ i18n.translate('ontologyCatalog.type') }}</th><th>{{ i18n.translate('ontologyCatalog.actions') }}</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name_en || item.name }}</td>
                <td>{{ item.country }}</td>
                <td><cds-tag [value]="item.type || 'national'" /></td>
                <td>
                  <button cdsButton icon="" [text]="true" severity="info" (onClick)="editItem('regulator', item)" />
                  <button cdsButton icon="" [text]="true" severity="danger" (onClick)="deleteItem('regulator', item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="4" class="text-center p-4">{{ i18n.translate('ontologyCatalog.noData') }}</td></tr>
            </ng-template>
          </table>
        </cds-tab>

        <!-- Frameworks Tab -->
        <cds-tab [header]="i18n.translate('ontologyCatalog.frameworks')">
          <div class="mb-3">
            <button cdsButton [label]="i18n.translate('ontologyCatalog.addFramework')" icon="" (onClick)="openDialog('framework')" />
          </div>
          <table cdsTable aria-label="Frameworks table" [value]="frameworks" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>{{ i18n.translate('ontologyCatalog.name') }}</th><th>{{ i18n.translate('ontologyCatalog.version') }}</th><th>{{ i18n.translate('ontologyCatalog.regulator') }}</th><th>{{ i18n.translate('ontologyCatalog.status') }}</th><th>{{ i18n.translate('ontologyCatalog.actions') }}</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name_en || item.name }}</td>
                <td>{{ item.version }}</td>
                <td>{{ item.regulator_name || item.regulator_id }}</td>
                <td><cds-tag [value]="item.status || 'active'" [severity]="item.status === 'draft' ? 'warning' : 'success'" /></td>
                <td>
                  <button cdsButton icon="" [text]="true" severity="info" (onClick)="editItem('framework', item)" />
                  <button cdsButton icon="" [text]="true" severity="danger" (onClick)="deleteItem('framework', item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="text-center p-4">{{ i18n.translate('ontologyCatalog.noData') }}</td></tr>
            </ng-template>
          </table>
        </cds-tab>

        <!-- Framework Layers Tab -->
        <cds-tab [header]="i18n.translate('ontologyCatalog.frameworkLayers')">
          <div class="mb-3">
            <button cdsButton [label]="i18n.translate('ontologyCatalog.addLayer')" icon="" (onClick)="openDialog('layer')" />
          </div>
          <table cdsTable aria-label="Layers table" [value]="layers" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>{{ i18n.translate('ontologyCatalog.name') }}</th><th>{{ i18n.translate('ontologyCatalog.level') }}</th><th>{{ i18n.translate('ontologyCatalog.framework') }}</th><th>{{ i18n.translate('ontologyCatalog.actions') }}</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name_en || item.name }}</td>
                <td>{{ item.level }}</td>
                <td>{{ item.framework_name || item.framework_id }}</td>
                <td>
                  <button cdsButton icon="" [text]="true" severity="info" (onClick)="editItem('layer', item)" />
                  <button cdsButton icon="" [text]="true" severity="danger" (onClick)="deleteItem('layer', item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="4" class="text-center p-4">{{ i18n.translate('ontologyCatalog.noData') }}</td></tr>
            </ng-template>
          </table>
        </cds-tab>

        <!-- Evidence Categories Tab -->
        <cds-tab [header]="i18n.translate('ontologyCatalog.evidenceCategories')">
          <div class="mb-3">
            <button cdsButton [label]="i18n.translate('ontologyCatalog.addCategory')" icon="" (onClick)="openDialog('evidence_category')" />
          </div>
          <table cdsTable aria-label="Evidence Categories table" [value]="evidenceCategories" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>{{ i18n.translate('ontologyCatalog.name') }}</th><th>{{ i18n.translate('ontologyCatalog.description') }}</th><th>{{ i18n.translate('ontologyCatalog.actions') }}</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name_en || item.name }}</td>
                <td>{{ item.description_en || item.description }}</td>
                <td>
                  <button cdsButton icon="" [text]="true" severity="info" (onClick)="editItem('evidence_category', item)" />
                  <button cdsButton icon="" [text]="true" severity="danger" (onClick)="deleteItem('evidence_category', item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="3" class="text-center p-4">{{ i18n.translate('ontologyCatalog.noData') }}</td></tr>
            </ng-template>
          </table>
        </cds-tab>

        <!-- Scoring Policies Tab -->
        <cds-tab [header]="i18n.translate('ontologyCatalog.scoringPolicies')">
          <div class="mb-3">
            <button cdsButton [label]="i18n.translate('ontologyCatalog.addPolicy')" icon="" (onClick)="openDialog('scoring_policy')" />
          </div>
          <table cdsTable aria-label="Scoring Policies table" [value]="scoringPolicies" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>{{ i18n.translate('ontologyCatalog.name') }}</th><th>{{ i18n.translate('ontologyCatalog.type') }}</th><th>{{ i18n.translate('ontologyCatalog.status') }}</th><th>{{ i18n.translate('ontologyCatalog.actions') }}</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name }}</td>
                <td><cds-tag [value]="item.type || 'weighted'" /></td>
                <td><cds-tag [value]="item.status || 'active'" [severity]="item.status === 'inactive' ? 'danger' : 'success'" /></td>
                <td>
                  <button cdsButton icon="" [text]="true" severity="info" (onClick)="editItem('scoring_policy', item)" />
                  <button cdsButton icon="" [text]="true" severity="danger" (onClick)="deleteItem('scoring_policy', item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="4" class="text-center p-4">{{ i18n.translate('ontologyCatalog.noData') }}</td></tr>
            </ng-template>
          </table>
        </cds-tab>

        <!-- Role Blueprints Tab -->
        <cds-tab [header]="i18n.translate('ontologyCatalog.roleBlueprints')">
          <div class="mb-3">
            <button cdsButton [label]="i18n.translate('ontologyCatalog.addBlueprint')" icon="" (onClick)="openDialog('role_blueprint')" />
          </div>
          <table cdsTable aria-label="Role Blueprints table" [value]="roleBlueprints" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr><th>{{ i18n.translate('ontologyCatalog.name') }}</th><th>{{ i18n.translate('ontologyCatalog.description') }}</th><th>{{ i18n.translate('ontologyCatalog.permissions') }}</th><th>{{ i18n.translate('ontologyCatalog.actions') }}</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.name_en || item.name }}</td>
                <td>{{ item.description_en || item.description }}</td>
                <td>{{ (item.permissions || []).length }}</td>
                <td>
                  <button cdsButton icon="" [text]="true" severity="info" (onClick)="editItem('role_blueprint', item)" />
                  <button cdsButton icon="" [text]="true" severity="danger" (onClick)="deleteItem('role_blueprint', item)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="4" class="text-center p-4">{{ i18n.translate('ontologyCatalog.noData') }}</td></tr>
            </ng-template>
          </table>
        </cds-tab>
      </cds-tabs>

      <!-- Create/Edit Dialog -->
      <cds-modal [header]="dialogHeader" [(visible)]="dialogVisible" [modal]="true" [style]="{width: '500px'}">
        <div class="flex flex-column gap-3 pt-3">
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('ontologyCatalog.nameEn') }}</label>
            <input pInputText [(ngModel)]="formData.name_en" />
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('ontologyCatalog.nameAr') }}</label>
            <input pInputText [(ngModel)]="formData.name_ar" />
          </div>
          <div class="flex flex-column gap-1">
            <label>{{ i18n.translate('ontologyCatalog.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="formData.description" rows="3"></textarea>
          </div>
          <div class="flex flex-column gap-1" *ngIf="dialogEntity === 'subsector'">
            <label>{{ i18n.translate('ontologyCatalog.parentSector') }}</label>
            <cds-dropdown [options]="sectorOptions" [(ngModel)]="formData.sector_id" optionLabel="label" optionValue="value" [placeholder]="'Select...'" />
          </div>
          <div class="flex flex-column gap-1" *ngIf="dialogEntity === 'framework'">
            <label>{{ i18n.translate('ontologyCatalog.regulatorLabel') }}</label>
            <cds-dropdown [options]="regulatorOptions" [(ngModel)]="formData.regulator_id" optionLabel="label" optionValue="value" [placeholder]="'Select...'" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('ontologyCatalog.cancel')" icon="" [text]="true" (onClick)="dialogVisible = false" />
          <button cdsButton [label]="i18n.translate('ontologyCatalog.save')" icon="" (onClick)="saveItem()" />
        </ng-template>
      </cds-modal>
    </app-page-shell>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class OntologyCatalogComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private subs: Subscription[] = [];
  loading = false;

  sectors: Record<string, any>[] = [];
  subsectors: Record<string, any>[] = [];
  regulators: Record<string, any>[] = [];
  frameworks: Record<string, any>[] = [];
  layers: Record<string, any>[] = [];
  evidenceCategories: Record<string, any>[] = [];
  scoringPolicies: Record<string, any>[] = [];
  roleBlueprints: Record<string, any>[] = [];

  // Dialog state
  dialogVisible = false;
  dialogHeader = '';
  dialogEntity = '';
  editingItem: Record<string, any> | null = null;
  formData: Record<string, any> = {};

  // Dropdown options
  sectorOptions: Record<string, any>[] = [];
  regulatorOptions: Record<string, any>[] = [];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private loadAll(): void {
    this.loading = true;
    this.subs.push(
      this.apiclientSvc.get('/ontology/sectors').subscribe({
        next: (d: Record<string, any>) => {
          this.sectors = asArray(d, 'sectors');
          this.sectorOptions = this.sectors.map((s: Record<string, any>) => ({ label: s.name_en || s.name, value: s.id }));
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.loading = false; this.cdr.markForCheck(); }
      })
    );
    this.subs.push(this.apiclientSvc.get('/ontology/subsectors').subscribe({ next: (d: Record<string, any>) => { this.subsectors = asArray(d, 'subsectors'); } }));
    this.subs.push(this.apiclientSvc.get('/ontology/regulators').subscribe({
      next: (d: Record<string, any>) => {
        this.regulators = asArray(d, 'regulators');
        this.regulatorOptions = this.regulators.map((r: Record<string, any>) => ({ label: r.name_en || r.name, value: r.id }));
      }
    }));
    this.subs.push(this.apiclientSvc.get('/ontology/frameworks').subscribe({ next: (d: Record<string, any>) => { this.frameworks = asArray(d, 'frameworks'); } }));
    this.subs.push(this.apiclientSvc.get('/ontology/layers').subscribe({ next: (d: Record<string, any>) => { this.layers = asArray(d, 'layers'); } }));
    this.subs.push(this.apiclientSvc.get('/ontology/evidence-categories').subscribe({ next: (d: Record<string, any>) => { this.evidenceCategories = asArray(d, 'categories'); } }));
    this.subs.push(this.apiclientSvc.get('/ontology/scoring-policies').subscribe({ next: (d: Record<string, any>) => { this.scoringPolicies = asArray(d, 'policies'); } }));
    this.subs.push(this.apiclientSvc.get('/ontology/role-blueprints').subscribe({ next: (d: Record<string, any>) => { this.roleBlueprints = asArray(d, 'blueprints'); } }));
  }

  openDialog(entity: string): void {
    this.dialogEntity = entity;
    this.editingItem = null;
    this.formData = {};
    const labels: Record<string, string> = {
      sector: this.i18n.translate('ontologyCatalog.addSector'),
      subsector: this.i18n.translate('ontologyCatalog.addSubsector'),
      regulator: this.i18n.translate('ontologyCatalog.addRegulator'),
      framework: this.i18n.translate('ontologyCatalog.addFramework'),
      layer: this.i18n.translate('ontologyCatalog.addLayer'),
      evidence_category: this.i18n.translate('ontologyCatalog.addEvidenceCategory'),
      scoring_policy: this.i18n.translate('ontologyCatalog.addScoringPolicy'),
      role_blueprint: this.i18n.translate('ontologyCatalog.addRoleBlueprint')
    };
    this.dialogHeader = labels[entity] || 'Add';
    this.dialogVisible = true;
  }

  editItem(entity: string, item: Record<string, any>): void {
    this.dialogEntity = entity;
    this.editingItem = item;
    this.formData = { ...item };
    this.dialogHeader = this.i18n.translate('ontologyCatalog.edit');
    this.dialogVisible = true;
  }

  saveItem(): void {
    const entityPaths: Record<string, string> = {
      sector: '/ontology/sectors',
      subsector: '/ontology/subsectors',
      regulator: '/ontology/regulators',
      framework: '/ontology/frameworks',
      layer: '/ontology/layers',
      evidence_category: '/ontology/evidence-categories',
      scoring_policy: '/ontology/scoring-policies',
      role_blueprint: '/ontology/role-blueprints'
    };
    const path = entityPaths[this.dialogEntity];
    if (!path) return;

    const obs = this.editingItem
      ? this.apiclientSvc.put(`${path}/${this.editingItem.id}`, this.formData)
      : this.apiclientSvc.post(path, this.formData);

    obs.subscribe({
      next: () => {
        this.dialogVisible = false;
        this.loadAll();
      }
    });
  }

  deleteItem(entity: string, item: Record<string, any>): void {
    const entityPaths: Record<string, string> = {
      sector: '/ontology/sectors',
      subsector: '/ontology/subsectors',
      regulator: '/ontology/regulators',
      framework: '/ontology/frameworks',
      layer: '/ontology/layers',
      evidence_category: '/ontology/evidence-categories',
      scoring_policy: '/ontology/scoring-policies',
      role_blueprint: '/ontology/role-blueprints'
    };
    const path = entityPaths[entity];
    if (!path) return;

    this.apiclientSvc.del(`${path}/${item.id}`).subscribe({
      next: () => { this.loadAll(); }
    });
  }
}
