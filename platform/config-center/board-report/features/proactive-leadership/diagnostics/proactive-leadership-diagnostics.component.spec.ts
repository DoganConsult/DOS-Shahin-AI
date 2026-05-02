import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProactiveLeadershipDiagnosticsComponent } from './proactive-leadership-diagnostics.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ProactiveLeadershipDiagnosticsComponent', () => {
  let component: ProactiveLeadershipDiagnosticsComponent;
  let fixture: ComponentFixture<ProactiveLeadershipDiagnosticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProactiveLeadershipDiagnosticsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ProactiveLeadershipDiagnosticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
