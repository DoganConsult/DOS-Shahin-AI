import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TrainingAwarenessComponent } from './training-awareness.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TrainingAwarenessComponent', () => {
  let component: TrainingAwarenessComponent;
  let fixture: ComponentFixture<TrainingAwarenessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingAwarenessComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TrainingAwarenessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
