import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiCockpitComponent } from './ai-cockpit.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiCockpitComponent', () => {
  let component: AiCockpitComponent;
  let fixture: ComponentFixture<AiCockpitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiCockpitComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiCockpitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
