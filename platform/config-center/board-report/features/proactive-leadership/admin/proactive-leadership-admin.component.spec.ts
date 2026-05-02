import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProactiveLeadershipAdminComponent } from './proactive-leadership-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ProactiveLeadershipAdminComponent', () => {
  let component: ProactiveLeadershipAdminComponent;
  let fixture: ComponentFixture<ProactiveLeadershipAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProactiveLeadershipAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ProactiveLeadershipAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
