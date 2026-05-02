import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RoleProfilesComponent } from './role-profiles.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RoleProfilesComponent', () => {
  let component: RoleProfilesComponent;
  let fixture: ComponentFixture<RoleProfilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleProfilesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RoleProfilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
