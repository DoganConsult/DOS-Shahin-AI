import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BcpStatusComponent } from './bcp-status.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BcpStatusComponent', () => {
  let component: BcpStatusComponent;
  let fixture: ComponentFixture<BcpStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BcpStatusComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BcpStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
