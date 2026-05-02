import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TrialExtensionAdminPageComponent } from './trial-extension-admin-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TrialExtensionAdminPageComponent', () => {
  let component: TrialExtensionAdminPageComponent;
  let fixture: ComponentFixture<TrialExtensionAdminPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrialExtensionAdminPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TrialExtensionAdminPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
