import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InvitationsTabComponent } from './invitations-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('InvitationsTabComponent', () => {
  let component: InvitationsTabComponent;
  let fixture: ComponentFixture<InvitationsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvitationsTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(InvitationsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
