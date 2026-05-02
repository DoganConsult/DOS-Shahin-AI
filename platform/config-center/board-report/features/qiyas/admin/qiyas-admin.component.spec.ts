import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasAdminComponent } from './qiyas-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasAdminComponent', () => {
  let component: QiyasAdminComponent;
  let fixture: ComponentFixture<QiyasAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
