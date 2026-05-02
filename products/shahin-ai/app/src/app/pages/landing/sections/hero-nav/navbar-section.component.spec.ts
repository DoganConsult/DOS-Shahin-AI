import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NavbarSectionComponent } from './navbar-section.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NavbarSectionComponent', () => {
  let component: NavbarSectionComponent;
  let fixture: ComponentFixture<NavbarSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarSectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NavbarSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
