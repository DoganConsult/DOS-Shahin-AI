import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiRouteRulesComponent } from './ai-route-rules.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiRouteRulesComponent', () => {
  let component: AiRouteRulesComponent;
  let fixture: ComponentFixture<AiRouteRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiRouteRulesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiRouteRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
