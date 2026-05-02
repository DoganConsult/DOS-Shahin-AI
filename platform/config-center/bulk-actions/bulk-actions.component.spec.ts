import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BulkActionsComponent } from './bulk-actions.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BulkActionsComponent', () => {
  let component: BulkActionsComponent;
  let fixture: ComponentFixture<BulkActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkActionsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BulkActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
