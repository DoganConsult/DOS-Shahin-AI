import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiBuiltinSectionComponent } from './ai-builtin-section.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiBuiltinSectionComponent', () => {
  let component: AiBuiltinSectionComponent;
  let fixture: ComponentFixture<AiBuiltinSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiBuiltinSectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiBuiltinSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
