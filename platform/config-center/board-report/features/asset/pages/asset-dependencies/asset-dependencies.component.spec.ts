import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AssetDependenciesComponent } from './asset-dependencies.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AssetDependenciesComponent', () => {
  let component: AssetDependenciesComponent;
  let fixture: ComponentFixture<AssetDependenciesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetDependenciesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AssetDependenciesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
