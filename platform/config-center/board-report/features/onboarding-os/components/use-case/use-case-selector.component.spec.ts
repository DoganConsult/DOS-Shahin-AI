import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UseCaseSelectorComponent } from './use-case-selector.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('UseCaseSelectorComponent', () => {
  let component: UseCaseSelectorComponent;
  let fixture: ComponentFixture<UseCaseSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UseCaseSelectorComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(UseCaseSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
