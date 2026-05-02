import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IntegrationsAdminComponent } from './integrations-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('IntegrationsAdminComponent', () => {
  let component: IntegrationsAdminComponent;
  let fixture: ComponentFixture<IntegrationsAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntegrationsAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(IntegrationsAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
