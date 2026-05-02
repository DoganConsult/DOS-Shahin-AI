import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AssetServiceMapComponent } from './asset-service-map.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AssetServiceMapComponent', () => {
  let component: AssetServiceMapComponent;
  let fixture: ComponentFixture<AssetServiceMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetServiceMapComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AssetServiceMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
