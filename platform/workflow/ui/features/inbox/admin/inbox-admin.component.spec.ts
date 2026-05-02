import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InboxAdminComponent } from './inbox-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('InboxAdminComponent', () => {
  let component: InboxAdminComponent;
  let fixture: ComponentFixture<InboxAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InboxAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(InboxAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
