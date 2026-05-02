import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ServiceHealthComponent } from './service-health.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ServiceHealthComponent', () => {
  let component: ServiceHealthComponent;
  let fixture: ComponentFixture<ServiceHealthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceHealthComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ServiceHealthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
