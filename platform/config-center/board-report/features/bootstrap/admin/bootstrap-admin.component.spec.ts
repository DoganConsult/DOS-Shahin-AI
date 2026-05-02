import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BootstrapAdminComponent } from './bootstrap-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BootstrapAdminComponent', () => {
  let component: BootstrapAdminComponent;
  let fixture: ComponentFixture<BootstrapAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BootstrapAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BootstrapAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
