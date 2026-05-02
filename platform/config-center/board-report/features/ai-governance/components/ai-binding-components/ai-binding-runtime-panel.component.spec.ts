import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiBindingRuntimePanelComponent } from './ai-binding-runtime-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiBindingRuntimePanelComponent', () => {
  let component: AiBindingRuntimePanelComponent;
  let fixture: ComponentFixture<AiBindingRuntimePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiBindingRuntimePanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiBindingRuntimePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
