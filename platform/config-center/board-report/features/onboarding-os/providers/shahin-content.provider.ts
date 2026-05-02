/**
 * ShahinContentProvider — Shahin AI product-specific onboarding content.
 *
 * Provides will-create previews for each onboarding stage and AI-suggested
 * responsibilities via the Shahin engine.
 *
 * @owner Shahin AI Product
 * @spec DOS-AIO Patch 0 Law 15 (product removable)
 * @since 2026-04-02  Step 6 extraction from shell
 */
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import { OnboardingContentProvider, WillCreateItem } from './onboarding-content.provider';
import { OnboardingApiService } from '../services/onboarding-api.service';
import { ONBOARDING_PLATFORM, type OnboardingPlatformPort } from '../ports/onboarding-platform.port';

@Injectable()
export class ShahinContentProvider implements OnboardingContentProvider {
  private api = inject(OnboardingApiService);
  private readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM);
  private get i18n() { return this.platform.i18n; }

  private get isAr(): boolean { return this.i18n.currentLang() === 'ar'; }

  /**
   * Stage → list of workspace items that will be created during provisioning.
   * These are displayed in the WillCreatePreview component to build user confidence.
   */
  private readonly STAGE_ITEMS: Record<string, WillCreateItem[]> = {
    organization_identity: [
      { icon: 'pi-building', labelEn: 'Organization record', labelAr: 'سجل المؤسسة' },
      { icon: 'pi-tag', labelEn: 'Sector tags', labelAr: 'تصنيفات القطاع' },
    ],
    pack_selection: [
      { icon: 'pi-box', labelEn: 'Module entitlements', labelAr: 'استحقاقات الموديولات' },
      { icon: 'pi-list', labelEn: 'Starter workflows', labelAr: 'سير عمل البداية' },
      { icon: 'pi-chart-bar', labelEn: 'Dashboard pack', labelAr: 'حزمة لوحة البيانات' },
    ],
    regulatory_scope: [
      { icon: 'pi-shield', labelEn: 'Framework mappings', labelAr: 'ربط الأُطر' },
      { icon: 'pi-file', labelEn: 'Obligation library', labelAr: 'مكتبة الالتزامات' },
      { icon: 'pi-lock', labelEn: 'Control baselines', labelAr: 'خطوط الأساس للضوابط' },
    ],
    people_ownership: [
      { icon: 'pi-users', labelEn: 'Role assignments', labelAr: 'تعيينات الأدوار' },
      { icon: 'pi-envelope', labelEn: 'Welcome invitations', labelAr: 'دعوات الترحيب' },
      { icon: 'pi-sitemap', labelEn: 'Approval matrix', labelAr: 'مصفوفة الموافقات' },
    ],
    org_structure: [
      { icon: 'pi-sitemap', labelEn: 'Org chart', labelAr: 'الهيكل التنظيمي' },
      { icon: 'pi-building', labelEn: 'Business units', labelAr: 'وحدات الأعمال' },
      { icon: 'pi-map-marker', labelEn: 'Locations', labelAr: 'المواقع' },
    ],
    data_start_mode: [
      { icon: 'pi-database', labelEn: 'Initial data records', labelAr: 'سجلات البيانات الأولية' },
      { icon: 'pi-chart-bar', labelEn: 'Starter dashboards', labelAr: 'لوحات بداية' },
    ],
    ai_setup: [
      { icon: 'pi-bolt', labelEn: 'Agent governance policies', labelAr: 'سياسات حوكمة الوكلاء', count: 17 },
      { icon: 'pi-shield', labelEn: 'Data access rules', labelAr: 'قواعد الوصول للبيانات' },
    ],
  };

  getWillCreateItems(stageCode: string): WillCreateItem[] {
    return this.STAGE_ITEMS[stageCode] || [];
  }

  async suggestResponsibilities(sessionId: string): Promise<void> {
    // MessageService must be injected where available (provided by shell component)
    // so we use a try/catch around the inject
    let messageService: MessageService | null = null;
    try {
      messageService = inject(MessageService);
    } catch {
      // Not in a provider scope with MessageService; skip toasts
    }

    try {
      const res = await firstValueFrom(this.api.suggestResponsibilities(sessionId));
      const suggestions = (res as any)?.suggestions;
      if (Array.isArray(suggestions) && suggestions.length > 0 && messageService) {
        messageService.add({
          severity: 'info',
          summary: this.isAr ? 'اقتراحات شاهين' : 'Shahin Suggestions',
          detail: this.isAr ? `${suggestions.length} اقتراحات للمسؤوليات` : `${suggestions.length} responsibility suggestions generated`,
          life: 5000,
        });
      }
    } catch {
      if (messageService) {
        messageService.add({
          severity: 'warn',
          summary: this.isAr ? 'لا توجد اقتراحات' : 'No suggestions',
          detail: this.isAr ? 'لم يتمكن شاهين من توليد اقتراحات الآن' : 'Shahin could not generate suggestions right now',
          life: 4000,
        });
      }
    }
  }
}
