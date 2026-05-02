import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfigGatewayComponent } from './config-gateway.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ConfigGatewayComponent', () => {
  let component: ConfigGatewayComponent;
  let fixture: ComponentFixture<ConfigGatewayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigGatewayComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ConfigGatewayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
