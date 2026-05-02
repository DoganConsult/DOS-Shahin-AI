import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AssetHomeComponent } from './asset-home.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AssetHomeComponent', () => {
  let component: AssetHomeComponent;
  let fixture: ComponentFixture<AssetHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetHomeComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AssetHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
