import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProvisioningOrchestratorPageComponent } from './provisioning-orchestrator-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ProvisioningOrchestratorPageComponent', () => {
  let component: ProvisioningOrchestratorPageComponent;
  let fixture: ComponentFixture<ProvisioningOrchestratorPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProvisioningOrchestratorPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ProvisioningOrchestratorPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
