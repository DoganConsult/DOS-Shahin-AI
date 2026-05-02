import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UcfBrowserComponent } from './ucf-browser.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('UcfBrowserComponent', () => {
  let component: UcfBrowserComponent;
  let fixture: ComponentFixture<UcfBrowserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UcfBrowserComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(UcfBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
