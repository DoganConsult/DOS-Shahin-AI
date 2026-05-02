import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GuidanceCardComponent } from './guidance-card.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GuidanceCardComponent', () => {
  let component: GuidanceCardComponent;
  let fixture: ComponentFixture<GuidanceCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidanceCardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GuidanceCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
