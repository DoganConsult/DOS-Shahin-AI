import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConnectorHealthComponent } from './connector-health.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ConnectorHealthComponent', () => {
  let component: ConnectorHealthComponent;
  let fixture: ComponentFixture<ConnectorHealthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectorHealthComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ConnectorHealthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
