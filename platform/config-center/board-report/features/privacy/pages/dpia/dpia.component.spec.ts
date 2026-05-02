import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DpiaComponent } from './dpia.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DpiaComponent', () => {
  let component: DpiaComponent;
  let fixture: ComponentFixture<DpiaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DpiaComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DpiaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
