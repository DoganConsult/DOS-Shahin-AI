import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PackSelectionComponent } from './pack-selection.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PackSelectionComponent', () => {
  let component: PackSelectionComponent;
  let fixture: ComponentFixture<PackSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PackSelectionComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PackSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
