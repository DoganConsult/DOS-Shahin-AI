import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationOrgDialogComponent } from './foundation-org-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationOrgDialogComponent', () => {
  let component: FoundationOrgDialogComponent;
  let fixture: ComponentFixture<FoundationOrgDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationOrgDialogComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationOrgDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
