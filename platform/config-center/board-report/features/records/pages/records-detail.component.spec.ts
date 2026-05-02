import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RecordsDetailComponent } from './records-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RecordsDetailComponent', () => {
  let component: RecordsDetailComponent;
  let fixture: ComponentFixture<RecordsDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordsDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RecordsDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
