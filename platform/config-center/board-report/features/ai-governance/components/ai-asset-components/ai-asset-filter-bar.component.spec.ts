import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAssetFilterBarComponent } from './ai-asset-filter-bar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAssetFilterBarComponent', () => {
  let component: AiAssetFilterBarComponent;
  let fixture: ComponentFixture<AiAssetFilterBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAssetFilterBarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAssetFilterBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
