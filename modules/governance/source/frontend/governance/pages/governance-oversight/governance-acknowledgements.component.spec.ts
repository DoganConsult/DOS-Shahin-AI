import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GovernanceAcknowledgementsComponent } from './governance-acknowledgements.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GovernanceAcknowledgementsComponent', () => {
  let component: GovernanceAcknowledgementsComponent;
  let fixture: ComponentFixture<GovernanceAcknowledgementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GovernanceAcknowledgementsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GovernanceAcknowledgementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
