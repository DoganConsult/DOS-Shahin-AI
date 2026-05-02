import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportsAdminComponent } from './reports-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ReportsAdminComponent', () => {
  let component: ReportsAdminComponent;
  let fixture: ComponentFixture<ReportsAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ReportsAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
