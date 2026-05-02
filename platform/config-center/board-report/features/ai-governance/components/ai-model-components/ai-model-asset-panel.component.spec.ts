import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiModelAssetPanelComponent } from './ai-model-asset-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiModelAssetPanelComponent', () => {
  let component: AiModelAssetPanelComponent;
  let fixture: ComponentFixture<AiModelAssetPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelAssetPanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiModelAssetPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
