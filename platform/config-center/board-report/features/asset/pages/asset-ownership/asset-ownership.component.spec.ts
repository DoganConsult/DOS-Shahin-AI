import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AssetOwnershipComponent } from './asset-ownership.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AssetOwnershipComponent', () => {
  let component: AssetOwnershipComponent;
  let fixture: ComponentFixture<AssetOwnershipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetOwnershipComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AssetOwnershipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
