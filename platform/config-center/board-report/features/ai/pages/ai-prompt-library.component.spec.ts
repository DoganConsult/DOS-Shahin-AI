import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiPromptLibraryComponent } from './ai-prompt-library.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiPromptLibraryComponent', () => {
  let component: AiPromptLibraryComponent;
  let fixture: ComponentFixture<AiPromptLibraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPromptLibraryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiPromptLibraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
