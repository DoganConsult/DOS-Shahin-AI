import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BulkActionBarComponent } from './bulk-action-bar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BulkActionBarComponent', () => {
  let component: BulkActionBarComponent;
  let fixture: ComponentFixture<BulkActionBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkActionBarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BulkActionBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
