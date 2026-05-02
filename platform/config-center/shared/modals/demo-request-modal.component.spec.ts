import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DemoRequestModalComponent } from './demo-request-modal.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DemoRequestModalComponent', () => {
  let component: DemoRequestModalComponent;
  let fixture: ComponentFixture<DemoRequestModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemoRequestModalComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DemoRequestModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
