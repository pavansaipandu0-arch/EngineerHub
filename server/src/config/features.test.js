import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FEATURES, PRODUCT_FEATURE_KEYS } from './features.js';

test('registry defines every requested module key without enabling unfinished modules', () => {
  const expected = [
    'community-hub',
    'question-board',
    'project-studio',
    'engineering-library',
    'engineering-tools',
    'engineer-profiles',
    'jobs-internships',
    'learning-center',
    'events-hackathons',
    'research-hub',
    'messaging',
    'notifications',
    'ai-assistant',
    'quiz-system',
    'project-showcase',
  ];
  assert.deepEqual([...PRODUCT_FEATURE_KEYS].sort(), expected.sort());
  const unfinished = DEFAULT_FEATURES.filter((feature) => !feature.implemented);
  assert.ok(unfinished.length > 0);
  assert.ok(unfinished.every((feature) => feature.enabled === false));
});
