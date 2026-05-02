import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiPromptsComponent } from './ai-prompts.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiPromptsComponent', () => {
  let component: AiPromptsComponent;
  let fixture: ComponentFixture<AiPromptsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPromptsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiPromptsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
