import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QiyasScopingComponent } from './qiyas-scoping.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('QiyasScopingComponent', () => {
  let component: QiyasScopingComponent;
  let fixture: ComponentFixture<QiyasScopingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QiyasScopingComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(QiyasScopingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
