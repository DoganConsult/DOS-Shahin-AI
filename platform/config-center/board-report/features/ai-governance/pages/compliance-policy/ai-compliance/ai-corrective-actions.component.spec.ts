import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiCorrectiveActionsComponent } from './ai-corrective-actions.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiCorrectiveActionsComponent', () => {
  let component: AiCorrectiveActionsComponent;
  let fixture: ComponentFixture<AiCorrectiveActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiCorrectiveActionsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiCorrectiveActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
