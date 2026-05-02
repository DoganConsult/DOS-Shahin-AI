import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RemediationVelocityComponent } from './remediation-velocity.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RemediationVelocityComponent', () => {
  let component: RemediationVelocityComponent;
  let fixture: ComponentFixture<RemediationVelocityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemediationVelocityComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RemediationVelocityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
