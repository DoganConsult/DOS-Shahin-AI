import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiCockpitWidgetComponent } from './ai-cockpit-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiCockpitWidgetComponent', () => {
  let component: AiCockpitWidgetComponent;
  let fixture: ComponentFixture<AiCockpitWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiCockpitWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiCockpitWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
