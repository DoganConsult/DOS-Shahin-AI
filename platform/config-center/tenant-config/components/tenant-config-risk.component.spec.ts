import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TenantConfigRiskComponent } from './tenant-config-risk.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TenantConfigRiskComponent', () => {
  let component: TenantConfigRiskComponent;
  let fixture: ComponentFixture<TenantConfigRiskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantConfigRiskComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TenantConfigRiskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
