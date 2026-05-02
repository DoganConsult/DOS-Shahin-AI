import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiTriggerComponent } from './ai-trigger.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiTriggerComponent', () => {
  let component: AiTriggerComponent;
  let fixture: ComponentFixture<AiTriggerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiTriggerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiTriggerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
