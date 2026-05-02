import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PainPointCtaStripComponent } from './pain-point-cta-strip.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PainPointCtaStripComponent', () => {
  let component: PainPointCtaStripComponent;
  let fixture: ComponentFixture<PainPointCtaStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PainPointCtaStripComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PainPointCtaStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
