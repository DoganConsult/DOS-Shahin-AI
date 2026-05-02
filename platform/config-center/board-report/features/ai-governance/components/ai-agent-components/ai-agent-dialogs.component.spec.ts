import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAgentDialogsComponent } from './ai-agent-dialogs.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAgentDialogsComponent', () => {
  let component: AiAgentDialogsComponent;
  let fixture: ComponentFixture<AiAgentDialogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAgentDialogsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAgentDialogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
