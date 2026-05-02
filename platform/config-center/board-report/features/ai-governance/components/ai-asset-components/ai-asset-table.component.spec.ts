import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAssetTableComponent } from './ai-asset-table.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAssetTableComponent', () => {
  let component: AiAssetTableComponent;
  let fixture: ComponentFixture<AiAssetTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAssetTableComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAssetTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
