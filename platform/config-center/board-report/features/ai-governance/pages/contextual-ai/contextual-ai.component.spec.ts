import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ContextualAiComponent } from './contextual-ai.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ContextualAiComponent', () => {
  let component: ContextualAiComponent;
  let fixture: ComponentFixture<ContextualAiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContextualAiComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ContextualAiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
