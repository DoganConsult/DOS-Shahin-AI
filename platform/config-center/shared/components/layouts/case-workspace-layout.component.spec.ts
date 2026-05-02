import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CaseWorkspaceLayoutComponent } from './case-workspace-layout.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CaseWorkspaceLayoutComponent', () => {
  let component: CaseWorkspaceLayoutComponent;
  let fixture: ComponentFixture<CaseWorkspaceLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaseWorkspaceLayoutComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CaseWorkspaceLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
