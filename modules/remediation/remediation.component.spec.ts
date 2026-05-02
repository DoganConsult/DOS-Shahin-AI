import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RemediationComponent } from './remediation.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RemediationComponent', () => {
  let component: RemediationComponent;
  let fixture: ComponentFixture<RemediationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemediationComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RemediationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
