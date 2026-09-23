import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from "@angular/core";
import { Languages } from "lucide-angular";
import { I18nService } from "../../../../core/services/i18n.service";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";

const DEFAULT_TEMPLATE_LOGO_URL = "images/chg-logo.png";

@Component({
  selector: "app-public-survey-header",
  standalone: true,
  imports: [IconComponent],
  template: `
    <header
      class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-[0_4px_20px_rgba(15,23,42,0.03)] backdrop-blur-md transition-all duration-200"
      [attr.dir]="i18n.direction()"
    >
      <div
        class="header-container mx-auto flex min-h-14 w-full max-w-3xl items-center justify-between gap-3 px-3 py-2 sm:min-h-16 sm:px-4 sm:py-2.5"
      >
        <!-- Start Side: Squircle Logo Frame + Branch Name Side-by-Side -->
        <div class="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div
            class="group relative flex shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white px-2 py-1 shadow-[0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:border-[#11A7C9]/50 hover:shadow-md hover:scale-[1.02] sm:rounded-2xl sm:px-2.5 sm:py-1.5"
          >
            <img
              class="h-8 w-auto max-h-8 max-w-[85px] object-contain transition-transform duration-300 group-hover:scale-[1.03] sm:h-10 sm:max-h-10 sm:max-w-[120px]"
              [src]="logoUrl()"
              [attr.alt]="logoAlt()"
              loading="eager"
              (error)="onLogoError($event)"
            />
          </div>

          @if (branchName()) {
            <div class="flex min-w-0 items-center gap-1.5">
              <span
                class="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#11A7C9] shadow-[0_0_6px_rgba(17,167,201,0.6)]"
              ></span>
              <p
                class="truncate text-xs font-bold leading-tight text-slate-800 sm:text-sm tracking-tight"
                [title]="branchName()!"
              >
                {{ branchName() }}
              </p>
            </div>
          }
        </div>

        <!-- End Side: Language Switcher Button -->
        <button
          type="button"
          class="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/95 px-2.5 text-[11px] font-bold text-slate-700 shadow-xs backdrop-blur-xs transition-all duration-200 hover:border-[#11A7C9] hover:bg-[#F2FBFC] hover:text-[#0D9FC0] hover:shadow-sm active:scale-[0.97] sm:px-3 sm:text-xs"
          [attr.aria-label]="nextLanguageLabel()"
          (click)="toggleLanguage()"
        >
          <app-icon
            [icon]="languageIcon"
            [size]="14"
            class="text-slate-500 transition-colors group-hover:text-[#0D9FC0]"
          />
          <span class="tracking-wide">{{ nextLanguageLabel() }}</span>
        </button>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
    }

    .header-container {
      animation: header-rise 380ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }

    @keyframes header-rise {
      from {
        opacity: 0;
        transform: translateY(-0.35rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .header-container {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicSurveyHeaderComponent {
  readonly i18n = inject(I18nService);
  readonly languageIcon = Languages;

  readonly logoUrl = input.required<string>();
  readonly logoAlt = input<string>("");
  readonly branchName = input<string | null>(null);

  nextLanguageLabel(): string {
    return this.i18n.nextLanguageLabel();
  }

  toggleLanguage(): void {
    this.i18n.toggleLanguage();
  }

  onLogoError(event: Event): void {
    const image = event.currentTarget;
    if (
      image instanceof HTMLImageElement &&
      !image.src.endsWith(DEFAULT_TEMPLATE_LOGO_URL)
    ) {
      image.src = DEFAULT_TEMPLATE_LOGO_URL;
    }
  }
}
