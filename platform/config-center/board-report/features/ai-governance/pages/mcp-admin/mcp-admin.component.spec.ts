import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { McpAdminComponent } from './mcp-admin.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('McpAdminComponent', () => {
  let component: McpAdminComponent;
  let fixture: ComponentFixture<McpAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [McpAdminComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(McpAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
