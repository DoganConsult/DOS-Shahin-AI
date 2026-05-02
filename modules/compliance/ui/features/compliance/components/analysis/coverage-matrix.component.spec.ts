import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CoverageMatrixComponent } from './coverage-matrix.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CoverageMatrixComponent', () => {
  let component: CoverageMatrixComponent;
  let fixture: ComponentFixture<CoverageMatrixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoverageMatrixComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CoverageMatrixComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
