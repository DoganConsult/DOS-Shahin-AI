import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SoxComplianceComponent } from './sox-compliance.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SoxComplianceComponent', () => {
  let component: SoxComplianceComponent;
  let fixture: ComponentFixture<SoxComplianceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoxComplianceComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SoxComplianceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
