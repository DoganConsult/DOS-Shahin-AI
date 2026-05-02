import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiPromptAssetListComponent } from './ai-prompt-asset-list.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiPromptAssetListComponent', () => {
  let component: AiPromptAssetListComponent;
  let fixture: ComponentFixture<AiPromptAssetListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPromptAssetListComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiPromptAssetListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
