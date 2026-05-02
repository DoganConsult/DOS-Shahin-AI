import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CopilotChatComponent } from './copilot-chat.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CopilotChatComponent', () => {
  let component: CopilotChatComponent;
  let fixture: ComponentFixture<CopilotChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CopilotChatComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CopilotChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
