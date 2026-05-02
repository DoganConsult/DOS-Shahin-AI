import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProvisioningProgressComponent } from './provisioning-progress.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ProvisioningProgressComponent', () => {
  let component: ProvisioningProgressComponent;
  let fixture: ComponentFixture<ProvisioningProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProvisioningProgressComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ProvisioningProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
