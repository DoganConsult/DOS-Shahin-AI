/**
 * Governance AI Schemas — Validation Tests
 *
 * MP-26 §12: unit tests for input validation schemas.
 * Migrated from old validateXxx() functions to Zod .safeParse().
 */

import {  describe, it, expect , vi as _vi } from 'vitest';
import {
  pipelineRunBody,
  escalateItemBody,
  feedbackBody,
  upsertDetectorBody,
  updateSettingBody,
  updateSignalStatusBody,
  deescalateBody,
  rejectRecommendationBody,
} from './governance-ai.schemas';

describe('pipelineRunBody', () => {
  it('accepts empty body (all optional)', () => {
    const result = pipelineRunBody.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid stages', () => {
    const result = pipelineRunBody.safeParse({ stages: ['signal_scan', 'interpretation'] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stages).toEqual(['signal_scan', 'interpretation']);
    }
  });

  it('rejects invalid stage names', () => {
    const result = pipelineRunBody.safeParse({ stages: ['invalid_stage'] });
    expect(result.success).toBe(false);
  });

  it('rejects non-array stages', () => {
    const result = pipelineRunBody.safeParse({ stages: 'signal_scan' });
    expect(result.success).toBe(false);
  });

  it('accepts dryRun boolean', () => {
    const result = pipelineRunBody.safeParse({ dryRun: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dryRun).toBe(true);
    }
  });

  it('rejects non-boolean dryRun', () => {
    const result = pipelineRunBody.safeParse({ dryRun: 'yes' });
    expect(result.success).toBe(false);
  });
});

describe('escalateItemBody', () => {
  const valid = {
    itemType: 'signal' as const,
    itemId: 'abc-123',
    targetLevel: 'executive' as const,
    reason: 'Critical finding requires executive attention',
  };

  it('accepts valid input', () => {
    const result = escalateItemBody.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.itemType).toBe('signal');
      expect(result.data.targetLevel).toBe('executive');
    }
  });

  it('rejects invalid itemType', () => {
    const result = escalateItemBody.safeParse({ ...valid, itemType: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid targetLevel', () => {
    const result = escalateItemBody.safeParse({ ...valid, targetLevel: 'ceo' });
    expect(result.success).toBe(false);
  });

  it('rejects empty reason', () => {
    const result = escalateItemBody.safeParse({ ...valid, reason: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    const result = escalateItemBody.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('feedbackBody', () => {
  const valid = {
    sourceType: 'signal' as const,
    sourceId: 'abc-123',
    feedbackType: 'positive' as const,
    feedbackText: 'Good detection accuracy',
  };

  it('accepts valid input', () => {
    const result = feedbackBody.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects invalid sourceType', () => {
    const result = feedbackBody.safeParse({ ...valid, sourceType: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid feedbackType', () => {
    const result = feedbackBody.safeParse({ ...valid, feedbackType: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('upsertDetectorBody', () => {
  const valid = {
    detector_code: 'test_detector',
    display_name_en: 'Test Detector',
    module_code: 'controls',
    detection_query: "SELECT * FROM controls WHERE test_status = 'failed'",
    signal_type: 'failed_control',
  };

  it('accepts valid input', () => {
    const result = upsertDetectorBody.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = upsertDetectorBody.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('rejects non-SELECT detection_query', () => {
    const result = upsertDetectorBody.safeParse({ ...valid, detection_query: 'DELETE FROM controls' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid confidence_base (> 1)', () => {
    const result = upsertDetectorBody.safeParse({ ...valid, confidence_base: 1.5 });
    expect(result.success).toBe(false);
  });

  it('accepts valid confidence_base', () => {
    const result = upsertDetectorBody.safeParse({ ...valid, confidence_base: 0.85 });
    expect(result.success).toBe(true);
  });
});

describe('updateSettingBody', () => {
  it('accepts valid key-value', () => {
    const result = updateSettingBody.safeParse({ key: 'pipeline.enabled', value: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.key).toBe('pipeline.enabled');
      expect(result.data.value).toBe('true');
    }
  });

  it('rejects missing key', () => {
    const result = updateSettingBody.safeParse({ value: 'true' });
    expect(result.success).toBe(false);
  });

  it('rejects missing value', () => {
    const result = updateSettingBody.safeParse({ key: 'test' });
    expect(result.success).toBe(false);
  });
});

describe('updateSignalStatusBody', () => {
  it('accepts valid status', () => {
    const result = updateSignalStatusBody.safeParse({ status: 'interpreted' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateSignalStatusBody.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('deescalateBody', () => {
  it('accepts with reason', () => {
    const result = deescalateBody.safeParse({ reason: 'False positive' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe('False positive');
    }
  });

  it('accepts without reason (optional)', () => {
    const result = deescalateBody.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('rejectRecommendationBody', () => {
  it('accepts with reason', () => {
    const result = rejectRecommendationBody.safeParse({ reason: 'Not applicable' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe('Not applicable');
    }
  });

  it('accepts without reason', () => {
    const result = rejectRecommendationBody.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects non-string reason', () => {
    const result = rejectRecommendationBody.safeParse({ reason: 123 });
    expect(result.success).toBe(false);
  });
});
