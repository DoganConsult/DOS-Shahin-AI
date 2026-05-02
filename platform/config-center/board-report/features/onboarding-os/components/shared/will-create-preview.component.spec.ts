import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WillCreatePreviewComponent } from './will-create-preview.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WillCreatePreviewComponent', () => {
  let component: WillCreatePreviewComponent;
  let fixture: ComponentFixture<WillCreatePreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WillCreatePreviewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(WillCreatePreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
