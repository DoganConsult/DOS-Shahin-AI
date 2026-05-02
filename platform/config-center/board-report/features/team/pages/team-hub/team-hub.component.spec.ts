import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TeamHubComponent } from './team-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TeamHubComponent', () => {
  let component: TeamHubComponent;
  let fixture: ComponentFixture<TeamHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TeamHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
