import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PrivacyHubComponent } from './privacy-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PrivacyHubComponent', () => {
  let component: PrivacyHubComponent;
  let fixture: ComponentFixture<PrivacyHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PrivacyHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
