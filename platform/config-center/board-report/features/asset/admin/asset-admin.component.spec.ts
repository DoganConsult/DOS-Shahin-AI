import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AssetAdminComponent } from './asset-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AssetAdminComponent', () => {
  let component: AssetAdminComponent;
  let fixture: ComponentFixture<AssetAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AssetAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
