import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GovernanceMilestonesComponent } from './governance-milestones.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GovernanceMilestonesComponent', () => {
  let component: GovernanceMilestonesComponent;
  let fixture: ComponentFixture<GovernanceMilestonesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GovernanceMilestonesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GovernanceMilestonesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
