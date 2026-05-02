import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SafeHtml } from '@angular/platform-browser';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { HtmlSanitizerService } from '@app/core/services/ui-infra/error-handling/html-sanitizer.service';
import { SectionHeaderComponent } from '@app/shared/widgets/section-header/section-header.component';
import { environment } from '@env/environment';
import { GrcOperationsService } from '@app/core/services/grc-operations.service';

interface AIAgent {
  id: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  image: string;
  /** From GET public-agents when API supplies quickPrompts */
  quickPrompts?: Array<{ en: string; ar: string }>;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

const AGENT_QUICK_PROMPTS: Record<string, { en: string; ar: string }[]> = {
  A01: [
    { en: 'What frameworks should a Saudi bank adopt?', ar: 'ما الأطر التي يجب أن يتبناها بنك سعودي؟' },
    { en: 'How to build a 90-day GRC program?', ar: 'كيف أبني برنامج حوكمة خلال 90 يومًا؟' },
  ],
  A02: [
    { en: 'How to implement least-privilege access?', ar: 'كيف أطبق مبدأ أقل الصلاحيات؟' },
    { en: 'NCA-ECC access control requirements?', ar: 'ما متطلبات التحكم بالوصول في NCA-ECC؟' },
  ],
  A03: [
    { en: 'How does NCA-ECC map to ISO 27001?', ar: 'كيف يتوافق NCA-ECC مع ISO 27001؟' },
    { en: 'What is a Unified Control Framework?', ar: 'ما هو إطار الضوابط الموحد؟' },
  ],
  A04: [
    { en: 'How to write an effective control statement?', ar: 'كيف أكتب بيان ضابطة فعال؟' },
    { en: 'NCA-ECC 2-2-1 implementation guidance?', ar: 'إرشادات تطبيق NCA-ECC 2-2-1؟' },
  ],
  A05: [
    { en: 'What evidence is needed for NCA-ECC compliance?', ar: 'ما الأدلة المطلوبة لامتثال NCA-ECC؟' },
    { en: 'Evidence freshness and chain-of-custody?', ar: 'حداثة الأدلة وسلسلة الحفظ؟' },
  ],
  A06: [
    { en: 'How to prioritize compliance gaps?', ar: 'كيف أرتب أولويات فجوات الامتثال؟' },
    { en: 'Build a phased remediation roadmap?', ar: 'بناء خارطة طريق معالجة مرحلية؟' },
  ],
  A07: [
    { en: 'Top cybersecurity risks for Saudi orgs?', ar: 'أهم مخاطر الأمن السيبراني للمنظمات السعودية؟' },
    { en: 'How does 5x5 risk scoring work?', ar: 'كيف يعمل تقييم المخاطر 5×5؟' },
  ],
  A08: [
    { en: 'Mandatory policies for NCA-ECC?', ar: 'السياسات الإلزامية لـ NCA-ECC؟' },
    { en: 'Policy review lifecycle best practices?', ar: 'أفضل ممارسات دورة مراجعة السياسات؟' },
  ],
  A09: [
    { en: 'Vendor risk assessment methodology?', ar: 'منهجية تقييم مخاطر الموردين؟' },
    { en: 'Saudi data localization requirements?', ar: 'متطلبات توطين البيانات السعودية؟' },
  ],
  A10: [
    { en: 'NCA compliance certification process?', ar: 'عملية شهادة امتثال NCA؟' },
    { en: 'Board-ready audit report structure?', ar: 'هيكل تقرير تدقيق جاهز لمجلس الإدارة؟' },
  ],
  A11: [
    { en: 'Show BCP readiness score', ar: 'عرض درجة جاهزية استمرارية الأعمال' },
    { en: 'Check overdue exercises', ar: 'فحص التمارين المتأخرة' },
    { en: 'Detect single points of failure', ar: 'كشف نقاط الفشل الأحادية' },
    { en: 'Show RTO/RPO drift', ar: 'عرض انحراف RTO/RPO' },
  ],
  A12: [
    { en: 'Show overdue training assignments', ar: 'عرض تعيينات التدريب المتأخرة' },
    { en: 'Check training completion rate', ar: 'فحص معدل إتمام التدريب' },
    { en: 'Identify training gaps', ar: 'تحديد فجوات التدريب' },
    { en: 'Recommend training programs', ar: 'اقتراح برامج تدريبية' },
  ],
  A13: [
    { en: 'What is Shahin-AI?', ar: 'ما هو شاهين الذكي؟' },
    { en: 'How do you handle GRC for banks?', ar: 'كيف تتعاملون مع الحوكمة للبنوك؟' },
    { en: 'Show me a sample compliance dashboard', ar: 'أظهر لي لوحة امتثال نموذجية' },
    { en: 'Book a demo', ar: 'احجز عرضاً تجريبياً' },
  ],
};

const AGENT_COLORS: Record<string, string> = {
  A01: 'var(--agent-a01)', A02: 'var(--agent-a02)', A03: 'var(--agent-a03)', A04: 'var(--agent-a04)', A05: 'var(--agent-a05)',
  A06: 'var(--agent-a06)', A07: 'var(--agent-a07)', A08: 'var(--agent-a08)', A09: 'var(--agent-a09)', A10: 'var(--agent-a10)',
  A11: 'var(--agent-a11)', A12: 'var(--agent-a12)', A13: 'var(--agent-a13)',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-ai-agents-section',
    standalone: true,
    imports: [CommonModule, FormsModule, SectionHeaderComponent],
    template: `
    <section class="agents-section">
      <div class="agents-container">
        <app-section-header
          badge="Shahin-AI Services Layer"
          badgeAr="طبقة خدمات Shahin-AI"
          badgeIcon="pi pi-microchip-ai"
          title="The Autonomous Squad — 13 Agents, Zero Manual Work"
          titleAr="الفريق المستقل — 13 وكيلاً، صفر عمل يدوي"
          subtitle="Shahin-AI runs an autonomous agent squad that handles compliance, risk, audit, and governance 24/7 — while you focus on strategy."
          subtitleAr="يدير Shahin-AI فريقاً مستقلاً من الوكلاء يتولى الامتثال والمخاطر والتدقيق والحوكمة على مدار الساعة — بينما تركز أنت على الاستراتيجية."
        />

        <!-- Master Orchestrator Card -->
        <div class="orchestrator-card">
          <div class="orch-visual">
            <img loading="eager" src="logoiconapphero.png" [alt]="i18n.translate('landing.aiAgents.orchestratorName')" class="orch-img" />
            <div class="orch-pulse"></div>
          </div>
          <div class="orch-content">
            <div class="orch-badge">{{ i18n.translate('landing.aiAgents.orchestratorBadge') }}</div>
            <h3 class="orch-name">{{ i18n.translate('landing.aiAgents.orchestratorName') }}</h3>
            <p class="orch-desc">{{ i18n.translate('landing.aiAgents.orchestratorDesc') }}</p>
            <div class="orch-agents-line">
              @for (a of agents; track a.id) {
              <span tabindex="0" role="button" (keyup.enter)="openChat(a)" class="orch-mini" (click)="openChat(a)" style="cursor:pointer">
                <img loading="lazy" [src]="a.image" [alt]="a.nameEn" width="28" height="28" />
              </span>
              }
            </div>
          </div>
        </div>

        <!-- Agent Grid -->
        <div class="agents-grid">
          @for (agent of agents; track agent.id) {
          <div tabindex="0" role="button" (keyup.enter)="openChat(agent)" class="agent-card" (click)="openChat(agent)" [class.active]="chatAgent()?.id === agent.id">
            <div class="agent-top">
              <img loading="eager" [src]="agent.image" [alt]="agent.nameEn" class="agent-avatar" />
              <span class="agent-tag">{{ agent.id }}</span>
              <span class="chat-badge"><i class="pi pi-comments"></i> {{ i18n.translate('landing.aiAgents.askAgent') }}</span>
            </div>
            <h3 class="agent-name">{{ i18n.localize(agent.nameEn, agent.nameAr) }}</h3>
            <p class="agent-desc">{{ i18n.localize(agent.descEn, agent.descAr) }}</p>
          </div>
          }
        </div>

        <!-- Agent Chat Panel (overlay) -->
        @if (chatAgent()) {
        <div tabindex="0" role="button" (keyup.enter)="closeChat()" class="agent-chat-overlay" (click)="closeChat()">
          <div tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="agent-chat-panel" (click)="$event.stopPropagation()" [class.rtl]="i18n.direction() === 'rtl'">
            <div class="chat-header" [style.background]="'linear-gradient(135deg, ' + getColor(chatAgent()!.id) + ', ' + getColor(chatAgent()!.id) + 'cc)'">
              <div class="chat-header-left">
                <img loading="lazy" [src]="chatAgent()!.image" [alt]="chatAgent()!.nameEn" class="chat-agent-img" />
                <div>
                  <div class="chat-agent-name">{{ i18n.localize(chatAgent()!.nameEn, chatAgent()!.nameAr) }}</div>
                  <div class="chat-agent-tag">{{ chatAgent()!.id }} — {{ i18n.translate('landing.aiAgents.publicMode') }}</div>
                </div>
              </div>
              <button aria-label="Close" class="chat-close" (click)="closeChat()"><i class="pi pi-times"></i></button>
            </div>

            <!-- PDPL/GDPR consent gate — required before any message
                 leaves the browser and lands in dos.audit_trail. The
                 audit-stamping continues server-side for every visitor
                 that opts in; this banner gates it client-side. The
                 consent decision is persisted in localStorage so the
                 banner only shows once per device. -->
            @if (!chatConsented()) {
            <div class="chat-consent">
              <div class="consent-icon"><i class="pi pi-shield"></i></div>
              <div class="consent-body">
                <strong>{{ i18n.localize('Privacy notice (PDPL)','إشعار الخصوصية (نظام حماية البيانات الشخصية)') }}</strong>
                <p>{{ i18n.localize(
                  'Your conversation with this AI assistant is processed by Anthropic Claude and stored anonymously in our audit log for compliance and quality. We do not capture your IP for marketing. If you provide an email, we will only use it to follow up about your stated intent (demo, pricing, support).',
                  'يتم معالجة محادثتك مع هذا المساعد الذكي عبر Anthropic Claude وحفظها في سجل التدقيق لدينا لأغراض الامتثال والجودة دون ربطها بهويتك. لن نستخدم بريدك الإلكتروني (إن قدمته) إلا للرد على طلبك المعلَن (عرض، أسعار، دعم).'
                ) }}</p>
                <div class="consent-actions">
                  <button class="consent-accept" (click)="acceptChatConsent()">
                    {{ i18n.localize('I agree, continue','موافق، المتابعة') }}
                  </button>
                  <button class="consent-decline" (click)="closeChat()">
                    {{ i18n.localize('Cancel','إلغاء') }}
                  </button>
                </div>
              </div>
            </div>
            } @else {
            <div class="chat-messages">
              <!-- Welcome + Quick prompts -->
              @if (chatMessages().length === 0) {
              <div class="chat-welcome">
                <img loading="lazy" [src]="chatAgent()!.image" [alt]="chatAgent()!.nameEn" class="welcome-img" />
                <p>{{ i18n.translate('landing.aiAgents.chatWelcome') }}</p>
                <div class="quick-prompts">
                  @for (qp of chatQuickPrompts(); track qp.en) {
                  <button class="qp-chip" [style.border-color]="getColor(chatAgent()!.id)" [style.color]="getColor(chatAgent()!.id)" (click)="sendQuickPrompt(qp)">
                    {{ i18n.localize(qp.en, qp.ar) }}
                  </button>
                  }
                </div>
              </div>
              }

              @for (msg of chatMessages(); track $index) {
              <div class="chat-msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'" [class.error]="msg.isError">
                <div class="msg-bubble" [innerHTML]="formatMsg(msg.content)"></div>
              </div>
              }

              @if (chatSending()) {
              <div class="chat-msg assistant">
                <div class="msg-bubble typing"><span></span><span></span><span></span></div>
              </div>
              }
            </div>

            <div class="chat-input-area">
              <div class="chat-note">
                <i class="pi pi-info-circle"></i>
                {{ i18n.translate('landing.aiAgents.chatNote') }}
              </div>
              <div class="chat-input">
                <input type="text" [(ngModel)]="chatInput" [placeholder]="i18n.translate('landing.aiAgents.chatPlaceholder')" [attr.aria-label]="i18n.translate('landing.aiAgents.chatPlaceholder')"
                       (keydown.enter)="sendChat()" [disabled]="chatSending()" />
                <button aria-label="Send" class="chat-send" (click)="sendChat()" [disabled]="!chatInput.trim() || chatSending()"
                        [style.background]="getColor(chatAgent()!.id)">
                  <i class="pi pi-send"></i>
                </button>
              </div>
              <!-- Optional contact field — visible after consent. Submitting
                   nothing is fine; if the visitor types an email it travels
                   on the next sendChat() and lands in copilot_leads. -->
              <div class="chat-contact">
                <input type="email"
                       [(ngModel)]="contactEmail"
                       [placeholder]="i18n.localize('Email (optional, for follow-up)','البريد الإلكتروني (اختياري، للمتابعة)')"
                       [attr.aria-label]="i18n.localize('Email (optional)','البريد الإلكتروني (اختياري)')" />
              </div>
            </div>
            }
          </div>
        </div>
        }
      </div>
    </section>
  `,
    styles: [`
    .agents-section { padding: clamp(48px, 7vw, 88px) 0; background: var(--surface-lavender); }
    .agents-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

    /* Master Orchestrator */
    .orchestrator-card {
      display: flex; align-items: center; gap: var(--space-xl);
      background: var(--ld-gradient-blue-soft, linear-gradient(135deg, var(--primary-darker), var(--primary-dark)));
      border-radius: var(--ld-card-radius, var(--radius-lg)); padding: 36px 40px; margin-bottom: 40px;
      position: relative; overflow: hidden;
    }
    .orchestrator-card::before {
      content: ''; position: absolute; inset: 0;
      background-image: radial-gradient(rgba(var(--color-white-rgb), 0.04) 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .orch-visual { position: relative; flex-shrink: 0; z-index: var(--z-base); }
    .orch-img { width: 120px; height: 120px; border-radius: var(--radius-pill); border: 3px solid rgba(var(--module-accent-yellow-rgb), 0.6); object-fit: cover; }
    .orch-pulse {
      position: absolute; inset: -8px; border-radius: var(--radius-pill);
      border: 2px solid rgba(var(--module-accent-yellow-rgb), 0.3);
      animation: orchPulse 2s ease-in-out infinite;
    }
    @keyframes orchPulse {
      0%, 100% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.08); opacity: 0.2; }
    }
    .orch-content { flex: 1; z-index: var(--z-base); }
    .orch-badge {
      display: inline-block; font-size: var(--font-size-xs); font-weight: var(--font-black); text-transform: uppercase;
      letter-spacing: 0.1em; padding: var(--space-xs) 14px; border-radius: var(--radius-pill);
      background: rgba(var(--module-accent-yellow-rgb), 0.2); color: var(--accent-gold); margin-bottom: var(--space-sm);
    }
    .orch-name { font-size: var(--font-size-lg); font-weight: var(--font-black); color: var(--text-on-primary); margin: 0 0 var(--space-sm); }
    .orch-desc { font-size: var(--font-size-base); color: rgba(var(--color-white-rgb), 0.9); line-height: 1.7; margin: 0 0 var(--space-md); }
    .orch-agents-line { display: flex; gap: 6px; flex-wrap: wrap; }
    .orch-mini img { border-radius: var(--radius-pill); border: 2px solid var(--glass-border); object-fit: cover; transition: all 200ms; }
    .orch-mini img:hover { border-color: var(--accent-gold); transform: scale(1.15); }

    /* Agent Grid */
    .agents-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .agent-card {
      padding: var(--space-lg); border-radius: var(--radius-lg); border: 1px solid var(--primary-lightest); background: var(--surface);
      transition: all 300ms; cursor: pointer;
    }
    .agent-card:hover { box-shadow: var(--shadow-card-hover); border-color: var(--primary); transform: translateY(-4px); }
    .agent-card.active { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary); }
    .agent-top { display: flex; align-items: center; gap: var(--radius); margin-bottom: 14px; }
    .agent-avatar { width: 48px; height: 48px; border-radius: var(--radius-pill); object-fit: cover; border: 2px solid var(--border-primary); }
    .agent-tag {
      font-size: var(--font-size-xs); font-weight: var(--font-black); text-transform: uppercase; letter-spacing: 0.08em;
      padding: 3px 10px; border-radius: var(--radius-pill); background: var(--border-primary); color: var(--primary-dark);
    }
    .chat-badge {
      margin-inline-start: auto; font-size: var(--font-size-xs); padding: 3px 8px; border-radius: var(--radius-md);
      background: var(--primary-lightest); color: var(--primary); display: flex; align-items: center; gap: 4px;
      opacity: 0; transition: opacity 200ms;
    }
    .agent-card:hover .chat-badge { opacity: 1; }
    .agent-name { font-size: var(--font-size-md); font-weight: var(--font-bold); color: var(--text-heading); margin: 0 0 var(--space-sm); }
    .agent-desc { font-size: var(--font-size-sm); color: var(--text-muted); line-height: 1.7; margin: 0; }

    /* Chat Overlay */
    .agent-chat-overlay {
      position: fixed; inset: 0; z-index: var(--z-skip-link); background: rgba(var(--color-black-rgb), 0.5);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 200ms;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .agent-chat-panel {
      width: 480px; max-width: 95vw; max-height: 85vh; border-radius: var(--radius-xl);
      background: var(--surface, #fff); box-shadow: 0 12px 60px rgba(var(--color-black-rgb), 0.25);
      display: flex; flex-direction: column; overflow: hidden;
      animation: slideUp 300ms ease-out;
    }
    @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .chat-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; color: #fff; }
    .chat-header-left { display: flex; align-items: center; gap: 10px; }
    .chat-agent-img { width: 36px; height: 36px; border-radius: var(--radius-pill); border: 2px solid rgba(var(--color-white-rgb), 0.4); object-fit: cover; }
    .chat-agent-name { font-weight: 700; font-size: var(--font-size-base); }
    .chat-agent-tag { font-size: var(--font-size-xs); opacity: 0.8; }
    .chat-close { background: none; border: none; color: #fff; cursor: pointer; opacity: 0.8; font-size: var(--font-size-md); padding: 4px; }
    .chat-close:hover { opacity: 1; }

    .chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; max-height: 400px; }

    .chat-welcome { text-align: center; padding: 20px 12px; }
    .welcome-img { width: 56px; height: 56px; border-radius: var(--radius-pill); margin-bottom: 8px; border: 2px solid var(--border-primary); }
    .chat-welcome p { font-size: var(--font-size-base); color: var(--text-muted); margin: 0 0 16px; line-height: 1.5; }
    .quick-prompts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .qp-chip {
      font-size: var(--font-size-sm); padding: 6px 12px; border-radius: var(--radius-xl);
      border: 1px solid; background: transparent; cursor: pointer;
      transition: background 150ms, color 150ms;
    }
    .qp-chip:hover { background: currentColor; color: #fff; }

    .chat-msg { display: flex; flex-direction: column; }
    .chat-msg.user { align-items: flex-end; }
    .chat-msg.assistant { align-items: flex-start; }
    .msg-bubble {
      max-width: 88%; padding: 10px 14px; border-radius: var(--radius-lg); font-size: var(--font-size-sm); line-height: 1.6;
      word-break: break-word; white-space: pre-wrap;
    }
    .user .msg-bubble { background: var(--primary); color: #fff; border-bottom-right-radius: 4px; }
    .assistant .msg-bubble { background: var(--surface-sunken, var(--surface-ice)); color: var(--text, var(--text-heading)); border-bottom-left-radius: 4px; }
    .chat-msg.error .msg-bubble { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .typing { display: flex; gap: 4px; padding: 12px 16px; }
    .typing span { width: 6px; height: 6px; border-radius: var(--radius-pill); background: var(--text-muted); animation: bounce 1.2s infinite; }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }

    .chat-input-area { border-top: 1px solid var(--border-subtle, var(--border-subtle)); }
    .chat-note {
      font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); padding: 6px 12px;
      display: flex; align-items: center; gap: 4px; background: var(--surface-sunken, var(--surface-ice));
    }
    .chat-note .pi { font-size: var(--font-size-xs); }
    .chat-input { display: flex; gap: 8px; padding: 10px 12px; }
    .chat-input input {
      flex: 1; border: 1px solid var(--border-subtle, var(--border-subtle)); border-radius: var(--radius);
      padding: 8px 12px; font-size: var(--font-size-sm); outline: none; background: var(--surface, #fff);
      color: var(--text, var(--text-heading));
    }
    .chat-input input:focus { border-color: var(--primary); }
    .chat-send {
      width: 36px; height: 36px; border-radius: var(--radius); border: none; cursor: pointer;
      color: #fff; display: flex; align-items: center; justify-content: center;
    }
    .chat-send:disabled { opacity: 0.5; cursor: not-allowed; }

    .chat-contact { padding: 0 12px 12px; }
    .chat-contact input {
      width: 100%; box-sizing: border-box; border: 1px solid var(--border-subtle, var(--border-subtle));
      border-radius: var(--radius); padding: 7px 10px; font-size: var(--font-size-xs);
      background: var(--surface, #fff); color: var(--text, var(--text-heading));
    }
    .chat-contact input:focus { border-color: var(--primary); outline: none; }

    .chat-consent {
      padding: 16px; display: flex; gap: 12px; align-items: flex-start;
      background: var(--surface-sunken, var(--surface-ice));
      border-bottom: 1px solid var(--border-subtle, var(--border-subtle));
    }
    .consent-icon {
      width: 36px; height: 36px; border-radius: var(--radius);
      background: var(--primary-soft, #dbeafe); color: var(--primary, #1e40af);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .consent-body { flex: 1; min-width: 0; }
    .consent-body strong { display: block; font-size: var(--font-size-sm); margin-bottom: 4px; color: var(--text-heading); }
    .consent-body p { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); line-height: 1.6; margin: 0 0 10px; }
    .consent-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .consent-accept, .consent-decline {
      padding: 6px 14px; border-radius: var(--radius); font-size: var(--font-size-xs);
      font-weight: 600; cursor: pointer; border: 1px solid transparent;
    }
    .consent-accept { background: var(--primary, #1e40af); color: #fff; }
    .consent-accept:hover { filter: brightness(.92); }
    .consent-decline { background: transparent; color: var(--text-muted); border-color: var(--border-subtle); }

    .rtl .user .msg-bubble { border-bottom-right-radius: 12px; border-bottom-left-radius: 4px; }
    .rtl .assistant .msg-bubble { border-bottom-left-radius: 12px; border-bottom-right-radius: 4px; }

    @media (max-width: 900px) {
      .orchestrator-card { flex-direction: column; text-align: center; padding: 28px 24px; }
      .orch-agents-line { justify-content: center; }
    }
    @media (max-width: 600px) {
      .agents-grid { grid-template-columns: 1fr; }
      .agent-chat-panel { width: calc(100vw - 16px); max-height: 90vh; }
    }
  `]
})
export class AIAgentsSectionComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private htmlSanitizer = inject(HtmlSanitizerService);

  agents: AIAgent[] = [];
  chatAgent = signal<AIAgent | null>(null);
  readonly chatQuickPrompts = computed(() => {
    const agent = this.chatAgent();
    if (!agent) return [];
    if (agent.quickPrompts?.length) return agent.quickPrompts;
    return AGENT_QUICK_PROMPTS[agent.id] || [];
  });
  chatMessages = signal<ChatMsg[]>([]);
  chatSending = signal(false);
  chatInput = '';
  /** Optional email — when filled, travels with the next sendChat() and lands in copilot_leads. */
  contactEmail = '';
  /** PDPL/GDPR consent persisted in localStorage so the banner only shows once per device. */
  private static readonly CONSENT_KEY = 'shahin_copilot_consent_v1';
  chatConsented = signal<boolean>(this.loadConsent());
  /** Conversation session id from server response — kept across turns for audit-trail correlation. */
  private chatSessionId: string | null = null;

  private loadConsent(): boolean {
    try {
      return typeof window !== 'undefined' && window.localStorage?.getItem(AIAgentsSectionComponent.CONSENT_KEY) === 'accepted';
    } catch { return false; }
  }
  acceptChatConsent(): void {
    try { window.localStorage?.setItem(AIAgentsSectionComponent.CONSENT_KEY, 'accepted'); } catch { /* private mode */ }
    this.chatConsented.set(true);
  }

  private fallbackAgents: AIAgent[] = [
    { id: 'A01', nameEn: 'Onboarding Agent', nameAr: 'وكيل الإعداد', descEn: 'Guides new tenants through onboarding: collects industry, size, licenses, IT landscape, and recommends applicable KSA regulatory frameworks (NCA-ECC, SAMA-CSF, PDPL, etc.). Generates workspace seed configuration.', descAr: 'يوجه المستأجرين الجدد عبر الإعداد: يجمع بيانات القطاع والحجم والتراخيص ويوصي بالأطر التنظيمية السعودية المناسبة.', image: 'agents/A01.png' },
    { id: 'A02', nameEn: 'Identity Provisioning Agent', nameAr: 'وكيل توفير الهويات', descEn: 'User provisioning and RBAC: detects access anomalies, enforces least-privilege and MFA posture, supports SSO patterns (Azure AD / OIDC), and surfaces role distribution and over-privileged accounts for review.', descAr: 'توفير المستخدمين وRBAC: يكشف حالات الوصول الشاذة ويفرض أقل الصلاحيات ووضع المصادقة الثنائية، ويدعم أنماط SSO، ويعرض توزيع الأدوار والحسابات ذات الصلاحيات المفرطة للمراجعة.', image: 'agents/A02.png' },
    { id: 'A03', nameEn: 'Framework Mapping Agent', nameAr: 'وكيل رسم الأطر', descEn: 'Maps controls across KSA regulatory frameworks (NCA-ECC, SAMA-CSF, PDPL, ISO 27001, PCI-DSS). Identifies overlapping requirements, reduces duplicate effort, and produces unified control matrices with confidence scores.', descAr: 'يربط الضوابط عبر الأطر التنظيمية السعودية ويحدد المتطلبات المتداخلة وينتج مصفوفات ضوابط موحدة.', image: 'agents/A03.png' },
    { id: 'A04', nameEn: 'Control Authoring Agent', nameAr: 'وكيل تأليف الضوابط', descEn: 'Drafts compliance controls, security policies, and implementation procedures aligned with KSA regulatory requirements. Generates bilingual (EN/AR) content with proper regulatory citations, maturity level targets, and evidence requirements.', descAr: 'يصيغ ضوابط الامتثال والسياسات الأمنية وإجراءات التنفيذ المتوافقة مع المتطلبات التنظيمية السعودية.', image: 'agents/A04.png' },
    { id: 'A05', nameEn: 'Evidence Collection Agent', nameAr: 'وكيل جمع الأدلة', descEn: 'Automates evidence gathering for compliance assessments. Analyzes uploaded documents (policies, screenshots, logs, certificates) to determine which controls they satisfy. Tracks evidence freshness, identifies gaps, and suggests required artifacts.', descAr: 'يؤتمت جمع الأدلة لتقييمات الامتثال ويحلل المستندات المرفوعة ويتتبع حداثة الأدلة ويحدد الثغرات.', image: 'agents/A05.png' },
    { id: 'A06', nameEn: 'Gap Remediation Agent', nameAr: 'وكيل معالجة الثغرات', descEn: 'Analyzes assessment results to identify compliance gaps, calculates risk-weighted priority scores, generates phased remediation roadmaps with timelines, resource estimates, and projected compliance score improvements.', descAr: 'يحلل نتائج التقييم لتحديد فجوات الامتثال ويحسب أولويات المخاطر وينشئ خرائط طريق معالجة مرحلية.', image: 'agents/A06.png' },
    { id: 'A07', nameEn: 'Risk Register Agent', nameAr: 'وكيل سجل المخاطر', descEn: 'Manages the enterprise risk register; identifies cyber, compliance, and operational risks; scores using likelihood x impact matrices (5x5); recommends treatment strategies (Mitigate, Transfer, Accept, Avoid); tracks Key Risk Indicators (KRIs) and risk appetite thresholds.', descAr: 'يدير سجل المخاطر المؤسسية ويحدد المخاطر السيبرانية والامتثالية ويقيّم باستخدام مصفوفات الاحتمال × الأثر.', image: 'agents/A07.png' },
    { id: 'A08', nameEn: 'Policy Lifecycle Agent', nameAr: 'وكيل دورة حياة السياسات', descEn: 'Manages the complete policy lifecycle: drafting, review, approval, publication, distribution, acknowledgment tracking, periodic review, and retirement. Monitors regulatory changes that require policy updates and triggers review workflows automatically.', descAr: 'يدير دورة حياة السياسات الكاملة من الصياغة إلى المراجعة والاعتماد والنشر والتقاعد.', image: 'agents/A08.png' },
    { id: 'A09', nameEn: 'Third-Party Risk Agent', nameAr: 'وكيل مخاطر الأطراف الثالثة', descEn: 'Assesses and monitors third-party/vendor risks: conducts due diligence questionnaires, evaluates vendor security posture, tracks SLA compliance, monitors for vendor breaches, and ensures supply chain alignment with NCA-ECC Third-Party Cybersecurity and SAMA-CSF requirements.', descAr: 'يقيّم ويراقب مخاطر الأطراف الثالثة ويجري استبيانات العناية الواجبة ويتتبع الامتثال لـ SLA.', image: 'agents/A09.png' },
    { id: 'A10', nameEn: 'Audit Reporting Agent', nameAr: 'وكيل التقارير التدقيقية', descEn: 'Generates comprehensive audit reports for regulators (NCA, SAMA, SDAIA), produces executive compliance dashboards, tracks certification status, and automates regulatory submission packages with proper formatting, Arabic translations, and evidence attachments.', descAr: 'ينشئ تقارير تدقيق شاملة للجهات الرقابية وينتج لوحات امتثال تنفيذية ويؤتمت حزم التقديم التنظيمية.', image: 'agents/A10.png' },
    { id: 'A11', nameEn: 'BCP Continuity Agent', nameAr: 'وكيل استمرارية الأعمال', descEn: 'Monitors business continuity readiness: BIA alignment, exercise cadence, RTO/RPO targets, dependency maps, and crisis communications discipline aligned with resilience expectations under national cybersecurity baselines.', descAr: 'يراقب جاهزية استمرارية الأعمال: محاذاة تحليل الأثر التجاري، وتيرة التمارين، وأهداف RTO/RPO، وخرائط التبعيات.', image: 'agents/A11.png' },
    { id: 'A12', nameEn: 'Security Awareness & Training Agent', nameAr: 'وكيل التوعية والتدريب الأمني', descEn: 'Tracks security awareness and training programs: completion rates, overdue assignments, skill-gap themes, and campaign effectiveness — supporting human-risk reduction alongside technical controls.', descAr: 'يتتبع برامج التوعية والتدريب الأمني: معدلات الإنجاز والتعيينات المتأخرة ومواضيع فجوات المهارات.', image: 'agents/A12.png' },
    { id: 'A13', nameEn: 'Landing Copilot Agent', nameAr: 'وكيل المساعد في الصفحة الرئيسية', descEn: 'Public-facing assistant for anonymous visitors: explains Shahin-AI GRC capabilities, KSA regulatory context, and safe next steps — without tenant data or write actions.', descAr: 'مساعد عام للزوار المجهولين: يشرح قدرات شاهين والسياق التنظيمي السعودي دون بيانات مستأجر أو إجراءات كتابة.', image: 'agents/A13.png' },
  ];

  ngOnInit(): void {
    this.operationsSvc.getPublicAgents().subscribe({
      next: (res: Record<string, any>) => {
        const mapped = this.mapAgentsFromOperations(res);
        if (mapped.length > 0) {
          this.agents = mapped;
          return;
        }
        this.fetchCopilotPublicAgents();
      },
      error: () => this.fetchCopilotPublicAgents(),
    });
  }

  private parseQuickPrompts(a: Record<string, unknown>): AIAgent['quickPrompts'] {
    const raw = a['quickPrompts'];
    if (!Array.isArray(raw)) return undefined;
    const out: Array<{ en: string; ar: string }> = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const en = typeof o['en'] === 'string' ? o['en'] : '';
      const ar = typeof o['ar'] === 'string' ? o['ar'] : '';
      if (en || ar) out.push({ en, ar });
    }
    return out.length ? out : undefined;
  }

  private mapAgentsFromOperations(res: Record<string, any>): AIAgent[] {
    return (res.agents || []).map((a: Record<string, any>) => {
      const quickPrompts = this.parseQuickPrompts(a as Record<string, unknown>);
      const base = {
        id: a.id,
        image: a.image || `agents/${a.id}.png`,
        nameEn: a.name || a.nameEn,
        nameAr: a.nameAr || a.name,
        descEn: a.summary || a.descEn || a.role || '',
        descAr: a.summaryAr || a.descAr || a.roleAr || this.getFallbackDescAr(a.id) || a.summary || '',
      };
      return quickPrompts?.length ? { ...base, quickPrompts } : base;
    });
  }

  private fetchCopilotPublicAgents(): void {
    this.http.get<{ agents?: Array<Record<string, unknown>> }>(`${environment.apiUrl}/copilot/public-agents`).subscribe({
      next: (body) => {
        const raw = body?.agents || [];
        const mapped: AIAgent[] = raw
          .map((a) => {
            const id = String(a['id'] ?? '');
            const quickPrompts = this.parseQuickPrompts(a);
            const base = {
              id,
              image: String(a['image'] ?? `agents/${id}.png`),
              nameEn: String(a['name'] ?? a['nameEn'] ?? ''),
              nameAr: String(a['nameAr'] ?? a['name'] ?? ''),
              descEn: String(a['summary'] ?? a['descEn'] ?? ''),
              descAr: String(a['summaryAr'] ?? a['descAr'] ?? (this.getFallbackDescAr(id) || '')),
            };
            return quickPrompts?.length ? { ...base, quickPrompts } : base;
          })
          .filter((x) => x.id);
        this.agents = mapped.length > 0 ? mapped : this.fallbackAgents;
      },
      error: () => {
        this.agents = this.fallbackAgents;
      },
    });
  }

  openChat(agent: AIAgent): void {
    this.chatAgent.set(agent);
    this.chatMessages.set([]);
    this.chatInput = '';
  }

  closeChat(): void {
    this.chatAgent.set(null);
  }

  private getFallbackDescAr(id: string): string {
    const fb = this.fallbackAgents.find(a => a.id === id);
    return fb?.descAr || '';
  }

  getColor(id: string): string { return AGENT_COLORS[id] || 'var(--agent-a13)'; }

  sendQuickPrompt(qp: { en: string; ar: string }): void {
    this.chatInput = this.i18n.localize(qp.en, qp.ar);
    this.sendChat();
  }

  sendChat(): void {
    const text = this.chatInput.trim();
    if (!text || this.chatSending() || !this.chatAgent()) return;
    // PDPL gate: do not POST any visitor data unless explicit consent.
    if (!this.chatConsented()) return;

    this.chatMessages.update(msgs => [...msgs, { role: 'user', content: text }]);
    this.chatInput = '';
    this.chatSending.set(true);

    const email = (this.contactEmail || '').trim();
    const body: Record<string, unknown> = {
      query: text,
      agentId: this.chatAgent()!.id,
    };
    if (this.chatSessionId) body.sessionId = this.chatSessionId;
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) body.email = email;

    this.http.post<any>(`${environment.apiUrl}/copilot/public-chat`, body).subscribe({
      next: (res) => {
        const payload = res && typeof res === 'object' ? (res as Record<string, unknown>) : {};
        const message = typeof payload['message'] === 'string' ? payload['message'] : 'No response';
        if (typeof payload['sessionId'] === 'string') this.chatSessionId = payload['sessionId'] as string;
        this.chatMessages.update(msgs => [...msgs, { role: 'assistant', content: message }]);
        this.chatSending.set(false);
      },
      error: () => {
        this.chatMessages.update(msgs => [...msgs, {
          role: 'assistant',
          content: this.i18n.translate('landing.aiAgents.chatError'),
          isError: true,
        }]);
        this.chatSending.set(false);
      },
    });
  }

  formatMsg(content: string): SafeHtml {
    // Basic markdown-like formatting, then sanitize with DOMPurify
    const html = content
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:var(--surface-ice);padding:1px 4px;border-radius:var(--radius-xs);font-size: var(--font-size-sm)">$1</code>')
      .replace(/\n/g, '<br>');
    return this.htmlSanitizer.sanitize(html);
  }
}
