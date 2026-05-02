import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiEntityContextPanelComponent } from './ai-entity-context-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiEntityContextPanelComponent', () => {
  let component: AiEntityContextPanelComponent;
  let fixture: ComponentFixture<AiEntityContextPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiEntityContextPanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiEntityContextPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
