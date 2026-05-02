import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAdminComponent } from './ai-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAdminComponent', () => {
  let component: AiAdminComponent;
  let fixture: ComponentFixture<AiAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
