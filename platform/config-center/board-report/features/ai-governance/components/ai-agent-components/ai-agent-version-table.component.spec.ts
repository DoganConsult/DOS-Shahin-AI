import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAgentVersionTableComponent } from './ai-agent-version-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAgentVersionTableComponent', () => {
  let component: AiAgentVersionTableComponent;
  let fixture: ComponentFixture<AiAgentVersionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAgentVersionTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAgentVersionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
