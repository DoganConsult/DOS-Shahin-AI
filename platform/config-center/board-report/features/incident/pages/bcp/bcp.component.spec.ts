import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BcpComponent } from './bcp.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BcpComponent', () => {
  let component: BcpComponent;
  let fixture: ComponentFixture<BcpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BcpComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BcpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
