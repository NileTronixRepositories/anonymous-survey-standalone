import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '../src/app/core/services/i18n.service';
import { MediaUrlService } from '../src/app/core/services/media-url.service';
import { APP_RUNTIME_CONFIG } from '../src/app/core/config/app-runtime-config';
import { QUESTION_ANSWER_TYPE, toQuestionAnswerType } from '../src/app/shared/models/question-answer.model';
import { PublicAnonymousTemplateService } from '../src/app/features/public-anonymous-survey/data/public-anonymous-template.service';
import { PublicAnonymousTemplateStore } from '../src/app/features/public-anonymous-survey/presentation/state/public-anonymous-template.store';
import { PublicAnonymousTemplatePageComponent } from '../src/app/features/public-anonymous-survey/presentation/pages/public-anonymous-template-page.component';
import { PublicSurveyBrandingService } from '../src/app/features/public-anonymous-survey/presentation/services/public-survey-branding.service';
import { PublicSurveyVoiceRecorderService } from '../src/app/features/public-anonymous-survey/presentation/services/public-survey-voice-recorder.service';

// Exercise the actual component, API mapper and serializer without adding a test framework.
// Private methods are accessed here only to assert the outgoing backend contract.
function survey(questions: object[], customInputs: object[] = [], conditions: object[] = []) {
  let submitted: any;
  const template = signal<any>(null);
  const store = {
    template, submitting: signal(false),
    submitResponse: (_id: string, payload: unknown) => { submitted = payload; },
  };
  const injector = Injector.create({ providers: [
    { provide: HttpClient, useValue: {} },
    { provide: APP_RUNTIME_CONFIG, useValue: { apiBaseUrl: 'https://example.test' } },
    { provide: ActivatedRoute, useValue: {} },
    { provide: Router, useValue: {} },
    { provide: I18nService, useValue: { language: signal('en'), isRtl: signal(false), translate: (key: string) => key } },
    { provide: MediaUrlService, useValue: {} },
    { provide: PublicSurveyBrandingService, useValue: {} },
    { provide: PublicSurveyVoiceRecorderService, useValue: { isRecording: signal(false) } },
    { provide: PublicAnonymousTemplateStore, useValue: store },
    PublicAnonymousTemplateService,
  ] });
  const service: any = injector.get(PublicAnonymousTemplateService);
  template.set(service.toTemplate({
    anonymousTemplateId: 'template', customInputs,
    questions: questions.map((question, index) => ({ anonymousTemplateQuestionId: `q${index}`, isRoot: true, ...question })),
    questionConditions: conditions,
  }, 'template'));
  const page: any = runInInjectionContext(injector, () => new PublicAnonymousTemplatePageComponent());
  const errorStore: any = runInInjectionContext(injector, () => new PublicAnonymousTemplateStore());
  return { page, service, template, errorStore, submitted: () => submitted };
}

test('all nine numeric, numeric-string and backend type names map correctly; unknown types are explicit', () => {
  for (const [name, value] of Object.entries(QUESTION_ANSWER_TYPE)) {
    assert.equal(toQuestionAnswerType(value), value);
    assert.equal(toQuestionAnswerType(String(value)), value);
    assert.equal(toQuestionAnswerType(name), value);
  }
  for (const value of [null, undefined, '', 0, 10, 'new-backend-type']) assert.equal(toQuestionAnswerType(value), null);
  const { page, template } = survey([{ type: 42 }, { type: 'FreeText' }, { type: 8 }, { type: 9 }]);
  assert.deepEqual(template().questions.map((q: any) => page.questionKind(q)), ['unsupported', 'freeText', 'rating1To10', 'dropdown']);
  assert.equal(page.isFormValid(template()), false);
});

test('optional questions can be skipped including a final conditional parent; empty answers are omitted', () => {
  const { page, template, submitted } = survey([{ type: 7, isRequired: false }, { type: 1, isRequired: false }]);
  page.goToNextQuestion();
  assert.equal(page.currentQuestionIndex(), 1);
  assert.equal(page.shouldShowNextAction(), false);
  assert.equal(page.questionError(template().questions[1]), '');
  page.submitSurvey();
  assert.deepEqual(submitted().answers, []);
  assert.equal(page.progressPercent(), 100);
  assert.equal(page.answeredVisibleQuestionsCount(), 0);
  assert.equal(page.missingRequiredQuestionsCount(), 0);
});

test('required defaults to true; whitespace does not satisfy FreeText and optional whitespace is omitted', () => {
  const { page, template } = survey([{ type: 7 }, { type: 7, isRequired: false }]);
  assert.equal(template().questions[0].isRequired, true);
  page.replaceAnswer('q0', { ...page.emptyAnswer(), textAnswer: '  ' });
  page.goToNextQuestion();
  assert.equal(page.currentQuestionIndex(), 0);
  assert.equal(page.isFormValid(template()), false);
  page.replaceAnswer('q0', { ...page.emptyAnswer(), textAnswer: ' Excellent service ' });
  page.replaceAnswer('q1', { ...page.emptyAnswer(), textAnswer: '  ' });
  assert.equal(page.isFormValid(template()), true);
  assert.deepEqual(page.toSubmitPayload().answers.map((a: any) => a.textAnswer), ['Excellent service']);
});

test('dropdown options retain configured labels, sort by order and submit IDs; invalid options block even optional answers', () => {
  const options = [
    { optionId: 'late', order: 2, textEn: 'Value 5', textAr: 'خمسة', value: 0 },
    { optionId: 'first', order: 1, textEn: 'Priority Score 1', value: 0 },
  ];
  const { page, template } = survey([{ type: 9, options, isRequired: false }, { type: 1, options }]);
  const [dropdown, choice] = template().questions;
  assert.deepEqual(dropdown.options.map((o: any) => o.optionId), ['first', 'late']);
  assert.equal(dropdown.options[0].textEn, 'Priority Score 1');
  assert.equal(choice.options[0].textEn, 'Priority');
  page.setSingleChoiceAnswer('q0', 'first');
  page.goToNextQuestion(); page.goToPreviousQuestion();
  assert.equal(page.answerFor('q0').selectedQuestionOptionId, 'first');
  assert.equal(page.toSubmitPayload().answers[0].selectedQuestionOptionId, 'first');
  page.setSingleChoiceAnswer('q0', 'foreign-option');
  assert.equal(page.isQuestionValid(dropdown), false);
  assert.deepEqual(page.toSubmitPayload().answers, []);
});

test('rating values validate integers and ranges for both required and optional answers', () => {
  for (const type of [3, 5, 8]) {
    const { page, template } = survey([{ type, isRequired: false }]);
    const field = type === 3 ? 'starRatingValue' : type === 5 ? 'smileValue' : 'rating1To10Value';
    for (const value of [-1, 0, 1.5, NaN, Infinity, type === 8 ? 11 : 6]) {
      page.replaceAnswer('q0', { ...page.emptyAnswer(), [field]: value });
      assert.equal(page.isQuestionValid(template().questions[0]), false);
    }
    page.replaceAnswer('q0', { ...page.emptyAnswer(), [field]: type === 8 ? 10 : 5 });
    assert.equal(page.isQuestionValid(template().questions[0]), true);
  }
});

test('dates are real calendar dates and VisitTime remains optional; prefix is trimmed and case sensitive', () => {
  const { page, template } = survey([], [
    { customInputId: 'visit', type: 3, systemFieldKey: 'VisitTime', isRequired: false },
    { customInputId: 'prefix', typeName: 'String', startWith: 'Ab', minLength: 3, maxLength: 8 },
    { customInputId: 'integer', type: 2, minValue: 1, maxValue: 10, startWith: 'ignored' },
  ]);
  const [visit, prefix, integer] = template().customInputs;
  assert.equal(visit.type, 3);
  assert.equal(page.customInputError(visit), '');
  assert.equal(page.toCustomInputValuePayload(visit), null);
  for (const value of ['2026-02-29', '2026-04-31', '0000-01-01', '2026-11-18T00:00:00Z', '18/11/2026']) {
    page.customInputValues.set({ visit: value });
    assert.notEqual(page.customInputError(visit), '');
  }
  for (const value of ['2024-02-29', '2000-02-29', '1900-02-28', '2099-11-18', '1900-01-01']) {
    page.customInputValues.set({ visit: value });
    assert.equal(page.customInputError(visit), '');
    assert.equal(page.toCustomInputValuePayload(visit).dateValue, value);
  }
  page.customInputValues.set({ prefix: '  Abc  ', integer: '5' });
  assert.equal(page.customInputError(prefix), '');
  assert.equal(page.customInputError(integer), '');
  page.customInputValues.set({ prefix: 'abc', integer: '5.5' });
  assert.notEqual(page.customInputError(prefix), '');
  assert.notEqual(page.customInputError(integer), '');
});

test('multi-level conditional paths clear hidden descendants and ignore unsupported triggers and parent types', () => {
  for (const [type, field, triggerType, triggerTypeName] of [
    [1, 'selectedQuestionOptionId', 1, 'SingleChoiceOption'],
    [3, 'starRatingValue', 2, 'StarRatingValue'],
    [5, 'smileValue', 3, 'SmileValue'],
  ] as const) {
    for (const numeric of [true, false]) {
      const { page, template } = survey([
        { type, options: [{ optionId: 'yes' }] },
        { type: 5, isRoot: false, isRequired: false },
        { type: 7, isRoot: false },
      ], [], [
        { parentAnonymousTemplateQuestionId: 'q0', childAnonymousTemplateQuestionId: 'q1', triggerType: numeric ? triggerType : null, triggerTypeName, selectedQuestionOptionId: 'yes', triggerValue: 5 },
        { parentAnonymousTemplateQuestionId: 'q1', childAnonymousTemplateQuestionId: 'q2', triggerType: 3, triggerValue: 4 },
      ]);
      page.replaceAnswer('q0', { ...page.emptyAnswer(), [field]: type === 1 ? 'yes' : 5 });
      assert.equal(page.visibleQuestions().length, 2);
      page.setSmileAnswer('q1', 4);
      page.replaceAnswer('q2', { ...page.emptyAnswer(), textAnswer: 'child' });
      assert.equal(page.visibleQuestions().length, 3);
      page.currentQuestionIndex.set(2);
      page.replaceAnswer('q0', page.emptyAnswer());
      assert.deepEqual(Object.keys(page.answers()), ['q0']);
      assert.equal(page.visibleQuestions().length, 1);
      assert.equal(page.currentVisibleQuestionIndex(), 0);
      assert.deepEqual(page.toSubmitPayload().answers, []);
      const condition = template().questionConditions[0];
      assert.equal(page.isConditionMatched({ ...condition, triggerType: 99 }, { ...page.emptyAnswer(), smileValue: 5 }, template().questions[0]), false);
      assert.equal(page.isConditionMatched(condition, { ...page.emptyAnswer(), selectedQuestionOptionId: 'yes', starRatingValue: 5, smileValue: 5 }, { ...template().questions[0], type: 9 }), false);
    }
  }
});

test('FormData sends exactly the correct field per type and preserves image bytes and date-only values', () => {
  const { page, service } = survey([
    { type: 9, options: [{ optionId: 'option-guid' }] }, { type: 8 }, { type: 7 },
    { type: 3 }, { type: 5 }, { type: 4 }, { type: 6 }, { type: 7, isRequired: false },
  ], [{ customInputId: 'date-guid', type: 3 }]);
  page.setSingleChoiceAnswer('q0', 'option-guid');
  page.setRating1To10Answer('q1', 8);
  page.replaceAnswer('q2', { ...page.emptyAnswer(), textAnswer: 'Excellent service' });
  page.setStarRatingAnswer('q3', 4); page.setSmileAnswer('q4', 5);
  page.replaceAnswer('q5', { ...page.emptyAnswer(), textAnswer: 'Comment' });
  const image = new File(['image-bytes'], 'photo.png', { type: 'image/png' });
  page.replaceAnswer('q6', { ...page.emptyAnswer(), imageFile: image });
  page.customInputValues.set({ 'date-guid': '2026-11-18' });
  const data = service.toSubmitFormData(page.toSubmitPayload());
  assert.deepEqual([...data.keys()], [
    'customInputValues[0].customInputId', 'customInputValues[0].dateValue',
    ...['selectedQuestionOptionId', 'rating1To10Value', 'textAnswer', 'starRatingValue', 'smileValue', 'textAnswer', 'imageFile']
      .flatMap((field, index) => [`answers[${index}].anonymousTemplateQuestionId`, `answers[${index}].${field}`]),
  ]);
  assert.equal(data.get('answers[0].selectedQuestionOptionId'), 'option-guid');
  assert.equal(data.get('answers[1].rating1To10Value'), '8');
  assert.equal(data.get('customInputValues[0].dateValue'), '2026-11-18');
  assert.equal(data.get('answers[6].imageFile').size, image.size);
});

test('local audio filenames cannot masquerade as persisted voice answers', () => {
  const { page, template } = survey([{ type: 2, isRequired: false }]);
  assert.equal(page.isFormValid(template()), true);
  page.replaceAnswer('q0', { ...page.emptyAnswer(), voiceFileName: 'local-recording.webm' });
  assert.equal(page.hasAnswer(template().questions[0]), false);
  assert.equal(page.isFormValid(template()), false);
  assert.deepEqual(page.toSubmitPayload().answers, []);
  page.clearVoiceAnswer('q0');
  assert.equal(page.isFormValid(template()), true);
});

test('backend validation codes map to customer-facing translations and network fallback is preserved', () => {
  const { errorStore } = survey([]);
  for (const [code, key] of Object.entries({
    DropdownAnswerInvalid: 'dropdownInvalid', Rating1To10AnswerInvalid: 'rating1To10Invalid',
    FreeTextAnswerInvalid: 'textRequired', CustomInputDateInvalid: 'dateInvalid',
    CustomInputStartWithInvalid: 'startWithRejected', VisibleQuestionMissingAnswer: 'missingVisibleAnswers',
    HiddenQuestionAnswerNotAllowed: 'hiddenAnswersRejected',
  })) {
    const error = new HttpErrorResponse({ status: 400, error: { errors: [{ code: `AnonTemplates.Submit.${code}` }] } });
    assert.equal(errorStore.readSubmitErrorKey(error), `publicAnonymousTemplates.${key}`);
  }
  assert.equal(errorStore.readSubmitErrorKey(new HttpErrorResponse({ status: 0 })), 'publicAnonymousTemplates.networkError');
});
