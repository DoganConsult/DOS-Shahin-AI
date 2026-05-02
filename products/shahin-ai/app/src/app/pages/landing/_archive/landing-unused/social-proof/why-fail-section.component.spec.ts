import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WhyFailSectionComponent } from './why-fail-section.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WhyFailSectionComponent', () => {
  let component: WhyFailSectionComponent;
  let fixture: ComponentFixture<WhyFailSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhyFailSectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WhyFailSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
