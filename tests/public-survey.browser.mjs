import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Optional browser check: run with an existing Playwright installation and Edge.
// PLAYWRIGHT_MODULE can point to that installation without changing project dependencies.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  for (const language of ['en', 'ar']) {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(lang => localStorage.setItem('anonymous_survey_language', lang), language);
      let multipart = '';
      await page.route('**/api/anon-templates/browser-test**', async route => {
        if (route.request().method() === 'POST') {
          multipart = route.request().postDataBuffer().toString('utf8');
          await route.fulfill({ json: { anonymousSurveyResponseId: 'response', anonymousTemplateId: 'browser-test', submittedOnUtc: '2026-11-18T12:00:00Z', answersCount: 3 } });
          return;
        }
        await route.fulfill({ json: {
          anonymousTemplateId: 'browser-test', nameEn: 'Customer feedback', nameAr: 'تقييم الخدمة',
          branch: { branchId: 'branch', nameEn: 'Main branch', nameAr: 'الفرع الرئيسي' },
          customInputs: [
            { customInputId: 'visit', type: 3, systemFieldKey: 'VisitTime', labelEn: 'Visit date', labelAr: 'تاريخ الزيارة', isRequired: false },
            { customInputId: 'reference', type: 1, startWith: 'Ab', labelEn: 'Reference', labelAr: 'الرقم المرجعي', isRequired: true },
          ],
          questions: [
            { anonymousTemplateQuestionId: 'q0', type: 9, isRoot: true, textEn: 'Choose a department', textAr: 'اختر القسم', options: [
              { optionId: 'late', order: 2, textEn: 'Priority Score 1', textAr: 'الأولوية Score 1', value: 0 },
              { optionId: 'first', order: 1, textEn: 'Reception', textAr: 'الاستقبال', value: 0 },
            ] },
            { anonymousTemplateQuestionId: 'q1', type: 8, isRoot: true, textEn: 'Rate your experience', textAr: 'قيّم تجربتك' },
            { anonymousTemplateQuestionId: 'q2', type: 7, isRoot: true, isRequired: false, textEn: 'Additional comments', textAr: 'تعليقات إضافية' },
            { anonymousTemplateQuestionId: 'q3', type: 5, isRoot: true, textEn: 'How satisfied are you?', textAr: 'ما مدى رضاك؟' },
            { anonymousTemplateQuestionId: 'q4', type: 1, isRoot: true, isRequired: false, textEn: 'Optional follow up', textAr: 'متابعة اختيارية', options: [{ optionId: 'yes', textEn: 'Yes', textAr: 'نعم' }] },
            { anonymousTemplateQuestionId: 'child', type: 7, isRoot: false, textEn: 'Follow up details', textAr: 'تفاصيل المتابعة' },
          ],
          questionConditions: [{ parentAnonymousTemplateQuestionId: 'q4', childAnonymousTemplateQuestionId: 'child', triggerType: 1, selectedQuestionOptionId: 'yes' }],
        } });
      });
      await page.goto('http://127.0.0.1:4300/survey/browser-test');
      const next = () => page.getByRole('button', { name: language === 'ar' ? 'التالي' : 'Next', exact: true }).click();
      const previous = () => page.getByRole('button', { name: language === 'ar' ? 'السابق' : 'Previous', exact: true }).click();
      await page.getByLabel(language === 'ar' ? 'الرقم المرجعي' : 'Reference').fill('wrong');
      await next();
      await page.getByRole('alert').filter({ hasText: language === 'ar' ? 'Ab' : 'Ab' }).waitFor();
      await page.getByLabel(language === 'ar' ? 'الرقم المرجعي' : 'Reference').fill('Ab123');
      await page.locator('input[type=date]').fill('2026-11-18');
      await next();
      assert.equal(await page.locator('html').getAttribute('dir'), language === 'ar' ? 'rtl' : 'ltr');
      assert.deepEqual(await page.locator('select option').evaluateAll(options => options.map(o => o.value)), ['', 'first', 'late']);
      assert.match(await page.locator('select option[value=late]').textContent(), /Score 1/);
      await next();
      await page.getByRole('alert').filter({ hasText: language === 'ar' ? 'اختر' : 'Select' }).waitFor();
      await page.locator('select').selectOption('late');
      await page.screenshot({ path: `.angular/dropdown-${language}-${width}.png` });
      await next();
      await page.getByRole('group').waitFor();
      const ratings = page.getByRole('group').getByRole('button');
      assert.equal(await ratings.count(), 10);
      await page.getByRole('button', { name: '8', exact: true }).focus();
      await page.keyboard.press('Enter');
      await page.getByRole('button', { name: '8', exact: true, pressed: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: '8', exact: true }).getAttribute('aria-pressed'), 'true');
      await page.screenshot({ path: `.angular/rating-${language}-${width}.png` });
      await previous();
      assert.equal(await page.locator('select').inputValue(), 'late');
      await next(); await next();
      await page.locator('textarea').fill('   ');
      await next();
      await page.getByRole('button', { name: language === 'ar' ? 'راضٍ جدًا' : 'Very satisfied', exact: true }).click();
      await next();
      assert.equal(await page.locator('body').evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('button', { name: language === 'ar' ? 'إرسال التقييم' : 'Submit response', exact: true }).click();
      await page.waitForURL('**/success?responseId=response');
      for (const field of ['selectedQuestionOptionId', 'rating1To10Value', 'smileValue', 'dateValue']) assert.ok(multipart.includes(field), field);
      assert.ok(!multipart.includes('textAnswer'));
      assert.ok(!multipart.includes('voiceFileName'));
      assert.equal((multipart.match(/name="answers\[\d+\]\.anonymousTemplateQuestionId"/g) || []).length, 3);
      console.log(`PASS browser survey: ${language}, ${width}px, keyboard, navigation, multipart and success`);
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
