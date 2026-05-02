import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FitchRulePaletteComponent } from './fitch-rule-palette.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FitchRulePaletteComponent', () => {
  let component: FitchRulePaletteComponent;
  let fixture: ComponentFixture<FitchRulePaletteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FitchRulePaletteComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FitchRulePaletteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
