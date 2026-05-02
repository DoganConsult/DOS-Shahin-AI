import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfigAuditComponent } from './config-audit.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ConfigAuditComponent', () => {
  let component: ConfigAuditComponent;
  let fixture: ComponentFixture<ConfigAuditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigAuditComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ConfigAuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
