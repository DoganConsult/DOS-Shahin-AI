import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FeatureValueHeaderComponent } from './feature-value-header.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FeatureValueHeaderComponent', () => {
  let component: FeatureValueHeaderComponent;
  let fixture: ComponentFixture<FeatureValueHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureValueHeaderComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FeatureValueHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
