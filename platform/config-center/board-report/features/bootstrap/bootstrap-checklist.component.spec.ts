import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BootstrapChecklistComponent } from './bootstrap-checklist.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BootstrapChecklistComponent', () => {
  let component: BootstrapChecklistComponent;
  let fixture: ComponentFixture<BootstrapChecklistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BootstrapChecklistComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BootstrapChecklistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
