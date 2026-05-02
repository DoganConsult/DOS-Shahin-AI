import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AssetCriticalComponent } from './asset-critical.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AssetCriticalComponent', () => {
  let component: AssetCriticalComponent;
  let fixture: ComponentFixture<AssetCriticalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetCriticalComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AssetCriticalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
