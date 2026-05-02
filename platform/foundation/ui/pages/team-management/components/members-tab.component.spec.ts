import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MembersTabComponent } from './members-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MembersTabComponent', () => {
  let component: MembersTabComponent;
  let fixture: ComponentFixture<MembersTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MembersTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
