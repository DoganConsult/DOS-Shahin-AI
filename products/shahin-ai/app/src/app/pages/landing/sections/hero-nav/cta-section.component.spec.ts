import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CtaSectionComponent } from './cta-section.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CtaSectionComponent', () => {
  let component: CtaSectionComponent;
  let fixture: ComponentFixture<CtaSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CtaSectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CtaSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
