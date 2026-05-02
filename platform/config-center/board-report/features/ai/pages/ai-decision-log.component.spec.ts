import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiDecisionLogComponent } from './ai-decision-log.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiDecisionLogComponent', () => {
  let component: AiDecisionLogComponent;
  let fixture: ComponentFixture<AiDecisionLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiDecisionLogComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiDecisionLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
