import { Routes } from '@angular/router';
import { PublicAnonymousTemplateService } from './data/public-anonymous-template.service';
import { PublicAnonymousTemplatePageComponent } from './presentation/pages/public-anonymous-template-page.component';
import { PublicAnonymousTemplateSuccessPageComponent } from './presentation/pages/public-anonymous-template-success-page.component';
import { PublicAnonymousTemplateStore } from './presentation/state/public-anonymous-template.store';

export const PUBLIC_ANONYMOUS_SURVEY_ROUTES: Routes = [
  {
    path: 'success',
    component: PublicAnonymousTemplateSuccessPageComponent,
  },
  {
    path: '',
    component: PublicAnonymousTemplatePageComponent,
    providers: [PublicAnonymousTemplateService, PublicAnonymousTemplateStore],
  },
];
