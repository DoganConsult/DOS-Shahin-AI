import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoraMajorIncidentsComponent } from './dora-major-incidents.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DoraMajorIncidentsComponent', () => {
  let component: DoraMajorIncidentsComponent;
  let fixture: ComponentFixture<DoraMajorIncidentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoraMajorIncidentsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DoraMajorIncidentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
