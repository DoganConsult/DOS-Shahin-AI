import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiBadgeComponent } from './ai-badge.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiBadgeComponent', () => {
  let component: AiBadgeComponent;
  let fixture: ComponentFixture<AiBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiBadgeComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
