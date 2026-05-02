import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SampleReportsComponent } from './sample-reports.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SampleReportsComponent', () => {
  let component: SampleReportsComponent;
  let fixture: ComponentFixture<SampleReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SampleReportsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SampleReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
