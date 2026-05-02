import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PortalsAdminComponent } from './portals-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PortalsAdminComponent', () => {
  let component: PortalsAdminComponent;
  let fixture: ComponentFixture<PortalsAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalsAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PortalsAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
