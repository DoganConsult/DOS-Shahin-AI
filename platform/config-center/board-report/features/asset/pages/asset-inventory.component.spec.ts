import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AssetInventoryComponent } from './asset-inventory.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AssetInventoryComponent', () => {
  let component: AssetInventoryComponent;
  let fixture: ComponentFixture<AssetInventoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetInventoryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AssetInventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
