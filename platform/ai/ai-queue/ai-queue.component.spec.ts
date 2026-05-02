import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiQueueComponent } from './ai-queue.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiQueueComponent', () => {
  let component: AiQueueComponent;
  let fixture: ComponentFixture<AiQueueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiQueueComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiQueueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
