import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditTeamComponent } from './audit-team.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AuditTeamComponent', () => {
  let component: AuditTeamComponent;
  let fixture: ComponentFixture<AuditTeamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditTeamComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AuditTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
