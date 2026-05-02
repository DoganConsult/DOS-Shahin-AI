import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BcpAdminComponent } from './bcp-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BcpAdminComponent', () => {
  let component: BcpAdminComponent;
  let fixture: ComponentFixture<BcpAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BcpAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BcpAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
