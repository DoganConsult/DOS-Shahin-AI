import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GovernanceOsAdminComponent } from './governance-os-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GovernanceOsAdminComponent', () => {
  let component: GovernanceOsAdminComponent;
  let fixture: ComponentFixture<GovernanceOsAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GovernanceOsAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GovernanceOsAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
