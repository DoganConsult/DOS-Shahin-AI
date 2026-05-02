import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TrainingWidgetComponent } from './training-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TrainingWidgetComponent', () => {
  let component: TrainingWidgetComponent;
  let fixture: ComponentFixture<TrainingWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TrainingWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
