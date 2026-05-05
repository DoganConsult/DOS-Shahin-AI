/**
 * Module Configuration for risk
 * 
 * Generated automatically by enterprise module standards
 * 
 * @owner risk
 * @since 2026-04-10
 */

// TODO: Re-enable when configuration-discipline.service is available
// import { configurationDisciplineService } from '../../../platform/dos/services/configuration-discipline.service';

// Register module configuration
// const config = configurationDisciplineService.createStandardSchema('risk');

// Add risk-specific configuration requirements
const config: any = {
  requirements: [
    {
      key: 'RISK_ASSESSMENT_TIMEOUT',
      type: 'number',
      required: false,
      description: 'Timeout for risk assessment calculations in seconds',
      defaultValue: 120,
      validation: {
        min: 30,
        max: 600
      },
      sensitive: false,
      category: 'infrastructure'
    },
    {
      key: 'RISK_MAX_ASSESSMENTS_PER_USER',
      type: 'number',
      required: false,
      description: 'Maximum number of risk assessments per user',
      defaultValue: 100,
      validation: {
        min: 1,
        max: 500
      },
      sensitive: false,
      category: 'business'
    },
    {
      key: 'RISK_AUTOMATIC_SCORING_ENABLED',
      type: 'boolean',
      required: false,
      description: 'Enable automatic risk scoring',
      defaultValue: true,
      sensitive: false,
      category: 'feature'
    },
    {
      key: 'RISK_AI_RECOMMENDATIONS_ENABLED',
      type: 'boolean',
      required: false,
      description: 'Enable AI-powered risk recommendations',
      defaultValue: true,
      sensitive: false,
      category: 'ai'
    }
  ],
  featureFlags: [
    {
      key: 'risk_bowtie_analysis',
      description: 'Enable bowtie risk analysis methodology',
      enabled: true,
      rolloutPercentage: 100
    },
    {
      key: 'risk_fair_assessment',
      description: 'Enable fair assessment methodology',
      enabled: true,
      rolloutPercentage: 85
    },
    {
      key: 'risk_digital_twin',
      description: 'Enable risk digital twin modeling',
      enabled: false,
      rolloutPercentage: 10
    },
    {
      key: 'risk_ai_gate_checks',
      description: 'Enable AI-powered gate checks for risk assessments',
      enabled: true,
      rolloutPercentage: 75,
      conditions: [
        {
          type: 'tenant_id',
          operator: 'in',
          value: ['premium', 'enterprise']
        }
      ]
    }
  ],
  validationRules: [
    {
      name: 'risk_configuration_validation',
      description: 'Validates risk configuration consistency',
      validator: (config: Record<string, unknown>) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check if assessment timeout is reasonable
        const timeout = Number(config.RISK_ASSESSMENT_TIMEOUT);
        if (config.RISK_ASSESSMENT_TIMEOUT !== undefined && !Number.isNaN(timeout) && timeout < 30) {
          errors.push('Assessment timeout too low - minimum 30 seconds recommended');
        }

        // Check if max assessments is reasonable
        const maxPerUser = Number(config.RISK_MAX_ASSESSMENTS_PER_USER);
        if (config.RISK_MAX_ASSESSMENTS_PER_USER !== undefined && !Number.isNaN(maxPerUser) && maxPerUser > 500) {
          warnings.push('High assessment limit may impact performance');
        }

        // Check AI configuration consistency
        if (config.RISK_AI_RECOMMENDATIONS_ENABLED && !config.RISK_AUTOMATIC_SCORING_ENABLED) {
          warnings.push('AI recommendations work best with automatic scoring enabled');
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings
        };
      }
    }
  ]
};

// configurationDisciplineService.registerConfiguration(config);

export default config;
