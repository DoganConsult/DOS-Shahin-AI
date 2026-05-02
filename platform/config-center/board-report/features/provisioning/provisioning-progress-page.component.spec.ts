import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProvisioningProgressPageComponent } from './provisioning-progress-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ProvisioningProgressPageComponent', () => {
  let component: ProvisioningProgressPageComponent;
  let fixture: ComponentFixture<ProvisioningProgressPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProvisioningProgressPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ProvisioningProgressPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
