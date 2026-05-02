import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AssetReportsComponent } from './asset-reports.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AssetReportsComponent', () => {
  let component: AssetReportsComponent;
  let fixture: ComponentFixture<AssetReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetReportsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AssetReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
