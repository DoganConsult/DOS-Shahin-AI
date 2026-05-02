import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlsHubComponent } from './controls-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ControlsHubComponent', () => {
  let component: ControlsHubComponent;
  let fixture: ComponentFixture<ControlsHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlsHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ControlsHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
