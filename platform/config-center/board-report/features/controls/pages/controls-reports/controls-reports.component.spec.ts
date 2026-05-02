import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlsReportsComponent } from './controls-reports.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlsReportsComponent', () => {
  let component: ControlsReportsComponent;
  let fixture: ComponentFixture<ControlsReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlsReportsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlsReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
