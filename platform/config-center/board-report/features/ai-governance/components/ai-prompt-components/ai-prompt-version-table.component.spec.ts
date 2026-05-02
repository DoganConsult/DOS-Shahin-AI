import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiPromptVersionTableComponent } from './ai-prompt-version-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiPromptVersionTableComponent', () => {
  let component: AiPromptVersionTableComponent;
  let fixture: ComponentFixture<AiPromptVersionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPromptVersionTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiPromptVersionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
