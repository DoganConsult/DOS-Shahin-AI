import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AssetHubComponent } from './asset-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AssetHubComponent', () => {
  let component: AssetHubComponent;
  let fixture: ComponentFixture<AssetHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AssetHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
