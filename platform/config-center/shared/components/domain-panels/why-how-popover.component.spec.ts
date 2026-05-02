import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WhyHowPopoverComponent } from './why-how-popover.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WhyHowPopoverComponent', () => {
  let component: WhyHowPopoverComponent;
  let fixture: ComponentFixture<WhyHowPopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhyHowPopoverComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WhyHowPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
