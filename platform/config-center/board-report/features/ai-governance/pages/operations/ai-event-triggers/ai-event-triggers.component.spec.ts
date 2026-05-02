import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiEventTriggersComponent } from './ai-event-triggers.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiEventTriggersComponent', () => {
  let component: AiEventTriggersComponent;
  let fixture: ComponentFixture<AiEventTriggersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiEventTriggersComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiEventTriggersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
