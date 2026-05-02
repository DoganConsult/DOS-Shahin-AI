import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RegulationCompilerComponent } from './regulation-compiler.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RegulationCompilerComponent', () => {
  let component: RegulationCompilerComponent;
  let fixture: ComponentFixture<RegulationCompilerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegulationCompilerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RegulationCompilerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
