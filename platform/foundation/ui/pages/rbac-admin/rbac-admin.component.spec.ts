import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RbacAdminComponent } from './rbac-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RbacAdminComponent', () => {
  let component: RbacAdminComponent;
  let fixture: ComponentFixture<RbacAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RbacAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RbacAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
