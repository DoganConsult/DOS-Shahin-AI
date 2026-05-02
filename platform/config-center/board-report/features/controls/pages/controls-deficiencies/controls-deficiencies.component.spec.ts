import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlsDeficienciesComponent } from './controls-deficiencies.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlsDeficienciesComponent', () => {
  let component: ControlsDeficienciesComponent;
  let fixture: ComponentFixture<ControlsDeficienciesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlsDeficienciesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlsDeficienciesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
