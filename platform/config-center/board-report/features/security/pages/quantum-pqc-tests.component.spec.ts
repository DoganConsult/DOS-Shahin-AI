import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QuantumPqcTestsComponent } from './quantum-pqc-tests.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QuantumPqcTestsComponent', () => {
  let component: QuantumPqcTestsComponent;
  let fixture: ComponentFixture<QuantumPqcTestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuantumPqcTestsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QuantumPqcTestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
