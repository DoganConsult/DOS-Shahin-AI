import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InstantDemoModalComponent } from './instant-demo-modal.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('InstantDemoModalComponent', () => {
  let component: InstantDemoModalComponent;
  let fixture: ComponentFixture<InstantDemoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstantDemoModalComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(InstantDemoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
