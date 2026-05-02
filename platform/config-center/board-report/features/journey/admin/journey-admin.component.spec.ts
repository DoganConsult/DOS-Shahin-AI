import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { JourneyAdminComponent } from './journey-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('JourneyAdminComponent', () => {
  let component: JourneyAdminComponent;
  let fixture: ComponentFixture<JourneyAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JourneyAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(JourneyAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
