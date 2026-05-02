import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OperatingCockpitPageComponent } from './operating-cockpit-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('OperatingCockpitPageComponent', () => {
  let component: OperatingCockpitPageComponent;
  let fixture: ComponentFixture<OperatingCockpitPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatingCockpitPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(OperatingCockpitPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
