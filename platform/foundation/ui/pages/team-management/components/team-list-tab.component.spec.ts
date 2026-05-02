import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TeamListTabComponent } from './team-list-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TeamListTabComponent', () => {
  let component: TeamListTabComponent;
  let fixture: ComponentFixture<TeamListTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamListTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TeamListTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
