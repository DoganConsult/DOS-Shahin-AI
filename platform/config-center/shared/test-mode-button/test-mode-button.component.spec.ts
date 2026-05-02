import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestModeButtonComponent } from './test-mode-button.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TestModeButtonComponent', () => {
  let component: TestModeButtonComponent;
  let fixture: ComponentFixture<TestModeButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestModeButtonComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TestModeButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
