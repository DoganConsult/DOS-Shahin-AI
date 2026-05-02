import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationAdminComponent } from './navigation-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NavigationAdminComponent', () => {
  let component: NavigationAdminComponent;
  let fixture: ComponentFixture<NavigationAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigationAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NavigationAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
