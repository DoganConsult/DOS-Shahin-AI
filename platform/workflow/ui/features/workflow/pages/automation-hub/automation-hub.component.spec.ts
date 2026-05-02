import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AutomationHubComponent } from './automation-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AutomationHubComponent', () => {
  let component: AutomationHubComponent;
  let fixture: ComponentFixture<AutomationHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutomationHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AutomationHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
