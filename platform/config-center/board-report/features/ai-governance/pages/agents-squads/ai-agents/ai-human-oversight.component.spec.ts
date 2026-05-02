import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiHumanOversightComponent } from './ai-human-oversight.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiHumanOversightComponent', () => {
  let component: AiHumanOversightComponent;
  let fixture: ComponentFixture<AiHumanOversightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiHumanOversightComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiHumanOversightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
