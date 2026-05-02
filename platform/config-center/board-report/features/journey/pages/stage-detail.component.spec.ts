import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StageDetailComponent } from './stage-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('StageDetailComponent', () => {
  let component: StageDetailComponent;
  let fixture: ComponentFixture<StageDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StageDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(StageDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
