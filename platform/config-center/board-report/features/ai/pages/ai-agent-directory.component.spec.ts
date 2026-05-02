import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAgentDirectoryComponent } from './ai-agent-directory.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAgentDirectoryComponent', () => {
  let component: AiAgentDirectoryComponent;
  let fixture: ComponentFixture<AiAgentDirectoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAgentDirectoryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAgentDirectoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
