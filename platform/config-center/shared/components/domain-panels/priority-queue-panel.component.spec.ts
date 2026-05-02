import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PriorityQueuePanelComponent } from './priority-queue-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PriorityQueuePanelComponent', () => {
  let component: PriorityQueuePanelComponent;
  let fixture: ComponentFixture<PriorityQueuePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriorityQueuePanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PriorityQueuePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
