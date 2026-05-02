import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiRedTeamDetailComponent } from './ai-red-team-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiRedTeamDetailComponent', () => {
  let component: AiRedTeamDetailComponent;
  let fixture: ComponentFixture<AiRedTeamDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiRedTeamDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiRedTeamDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
