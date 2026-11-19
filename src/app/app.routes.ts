import { Routes } from "@angular/router";
import { PublicAnonymousTemplateService } from "./features/public-anonymous-survey/data/public-anonymous-template.service";
import { PublicAnonymousTemplatePageComponent } from "./features/public-anonymous-survey/presentation/pages/public-anonymous-template-page.component";
import { PublicAnonymousTemplateStore } from "./features/public-anonymous-survey/presentation/state/public-anonymous-template.store";
import { PUBLIC_ANONYMOUS_SURVEY_ROUTES } from "./features/public-anonymous-survey/public-anonymous-survey.routes";

export const routes: Routes = [
  {
    path: "survey",
    component: PublicAnonymousTemplatePageComponent,
    providers: [PublicAnonymousTemplateService, PublicAnonymousTemplateStore],
  },
  {
    path: "survey/:anonymousTemplateId",
    children: PUBLIC_ANONYMOUS_SURVEY_ROUTES,
  },
  {
    path: "",
    pathMatch: "full",
    redirectTo: "survey",
  },
  {
    path: "**",
    redirectTo: "survey",
  },
];
