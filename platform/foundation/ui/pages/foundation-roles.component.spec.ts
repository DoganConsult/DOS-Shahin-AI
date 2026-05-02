import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationRolesComponent } from './foundation-roles.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationRolesComponent', () => {
  let component: FoundationRolesComponent;
  let fixture: ComponentFixture<FoundationRolesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationRolesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationRolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
