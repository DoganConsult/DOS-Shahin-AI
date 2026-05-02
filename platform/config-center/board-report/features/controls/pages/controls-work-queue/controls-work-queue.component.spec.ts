import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlsWorkQueueComponent } from './controls-work-queue.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlsWorkQueueComponent', () => {
  let component: ControlsWorkQueueComponent;
  let fixture: ComponentFixture<ControlsWorkQueueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlsWorkQueueComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlsWorkQueueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
