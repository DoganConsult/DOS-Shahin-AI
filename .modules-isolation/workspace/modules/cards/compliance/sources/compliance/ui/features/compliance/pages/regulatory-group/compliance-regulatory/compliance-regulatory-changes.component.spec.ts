import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComplianceRegulatoryChangesComponent } from './compliance-regulatory-changes.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ComplianceRegulatoryChangesComponent', () => {
  let component: ComplianceRegulatoryChangesComponent;
  let fixture: ComponentFixture<ComplianceRegulatoryChangesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceRegulatoryChangesComponent], // Assuming standalone component
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '1' } },
            params: of({ id: '1' }),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComplianceRegulatoryChangesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
