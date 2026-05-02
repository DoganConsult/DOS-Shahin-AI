import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IncidentHubComponent } from './incident-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('IncidentHubComponent', () => {
  let component: IncidentHubComponent;
  let fixture: ComponentFixture<IncidentHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(IncidentHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
