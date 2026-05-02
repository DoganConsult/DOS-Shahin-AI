import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TeamCommandCenterComponent } from './team-command-center.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TeamCommandCenterComponent', () => {
  let component: TeamCommandCenterComponent;
  let fixture: ComponentFixture<TeamCommandCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamCommandCenterComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TeamCommandCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
