import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MemberLifecyclePanelComponent } from './member-lifecycle-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MemberLifecyclePanelComponent', () => {
  let component: MemberLifecyclePanelComponent;
  let fixture: ComponentFixture<MemberLifecyclePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberLifecyclePanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(MemberLifecyclePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
