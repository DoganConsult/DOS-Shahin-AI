import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FitchHubComponent } from './fitch-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FitchHubComponent', () => {
  let component: FitchHubComponent;
  let fixture: ComponentFixture<FitchHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FitchHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FitchHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
