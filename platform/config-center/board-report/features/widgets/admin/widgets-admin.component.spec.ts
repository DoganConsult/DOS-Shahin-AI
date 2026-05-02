import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WidgetsAdminComponent } from './widgets-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WidgetsAdminComponent', () => {
  let component: WidgetsAdminComponent;
  let fixture: ComponentFixture<WidgetsAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetsAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WidgetsAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
