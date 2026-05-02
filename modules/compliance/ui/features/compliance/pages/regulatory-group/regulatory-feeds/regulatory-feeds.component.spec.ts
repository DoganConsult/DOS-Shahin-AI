import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RegulatoryFeedsComponent } from './regulatory-feeds.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RegulatoryFeedsComponent', () => {
  let component: RegulatoryFeedsComponent;
  let fixture: ComponentFixture<RegulatoryFeedsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegulatoryFeedsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RegulatoryFeedsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
