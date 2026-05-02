import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IncidentAdminComponent } from './incident-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('IncidentAdminComponent', () => {
  let component: IncidentAdminComponent;
  let fixture: ComponentFixture<IncidentAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(IncidentAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
