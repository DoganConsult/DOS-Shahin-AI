import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProvisioningWidgetComponent } from './provisioning-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ProvisioningWidgetComponent', () => {
  let component: ProvisioningWidgetComponent;
  let fixture: ComponentFixture<ProvisioningWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProvisioningWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ProvisioningWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
