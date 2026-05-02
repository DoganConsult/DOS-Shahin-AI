import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConnectorHubComponent } from './connector-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ConnectorHubComponent', () => {
  let component: ConnectorHubComponent;
  let fixture: ComponentFixture<ConnectorHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectorHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ConnectorHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
