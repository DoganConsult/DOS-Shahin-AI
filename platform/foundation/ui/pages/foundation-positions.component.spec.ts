import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationPositionsComponent } from './foundation-positions.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationPositionsComponent', () => {
  let component: FoundationPositionsComponent;
  let fixture: ComponentFixture<FoundationPositionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationPositionsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationPositionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
