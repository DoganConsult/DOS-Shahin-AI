import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RedTeamComponent } from './red-team.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RedTeamComponent', () => {
  let component: RedTeamComponent;
  let fixture: ComponentFixture<RedTeamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RedTeamComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RedTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
