import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FrameworkComplianceComponent } from './framework-compliance.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FrameworkComplianceComponent', () => {
  let component: FrameworkComplianceComponent;
  let fixture: ComponentFixture<FrameworkComplianceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameworkComplianceComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FrameworkComplianceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
