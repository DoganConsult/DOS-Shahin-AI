import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NextActionsBlockComponent } from './next-actions-block.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NextActionsBlockComponent', () => {
  let component: NextActionsBlockComponent;
  let fixture: ComponentFixture<NextActionsBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NextActionsBlockComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NextActionsBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
